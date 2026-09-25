/* ============================================================
   src/StripeCheckout.jsx
   Stripe payment checkout for the TAFX PM Portal.

   Replaces WhopCheckout.jsx (Whop was fully retired — see the
   stripe-webhook / create-checkout-session Supabase Edge Functions,
   the same ones tafx.co.za's landing page uses). Posts to
   create-checkout-session, which returns a Stripe-hosted checkout
   URL to redirect to.
   ============================================================ */

import { useState } from 'react';

const SUPABASE_URL = 'https://sicegpbjpulqbomkrrtn.supabase.co';
const CHECKOUT_SESSION_URL = `${SUPABASE_URL}/functions/v1/create-checkout-session`;

/* ---- Plan IDs — the same Stripe Price IDs used on tafx.co.za ---- */
export const STRIPE_PLANS = {
  scalping: { id: 'price_1UJTlRPa6N6QL2tDPxUqkbhY', name: 'TA Scalping Model',  price: 'R999',   period: 'once-off' },
  course:   { id: 'price_1UJTmbPa6N6QL2tDP802Tfuf', name: 'TaahaFX Course',     price: 'R1 499', period: 'once-off' },
  private:  { id: 'price_1UJTnmPa6N6QL2tDuzug9XNP', name: 'Private Mentorship', price: 'R800',   period: 'per month' },
  oneonone: { id: 'price_1UJToZPa6N6QL2tDLdbHHcBI', name: '1-to-1 Mentorship',  price: 'R2 000', period: 'per month' },
};

/* ============================================================
   <StripeCheckoutModal />
   Opens a small overlay collecting/confirming the buyer's email,
   then redirects to Stripe's hosted checkout.

   <StripeCheckoutModal
     planKey="oneonone"
     email={student.email}
     onClose={() => setShowUpgrade(false)}
   />
   ============================================================ */
export function StripeCheckoutModal({ planKey, email: initialEmail, onClose }) {
  const plan = STRIPE_PLANS[planKey];
  const [email, setEmail] = useState(initialEmail || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!plan) return null;

  async function go(e) {
    e.preventDefault();
    if (!email || email.indexOf('@') === -1) { setErr('Enter a valid email address.'); return; }
    setErr(''); setBusy(true);
    try {
      const r = await fetch(CHECKOUT_SESSION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, price_id: plan.id }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.url) throw new Error(data.error || 'Something went wrong starting checkout. Please try again.');
      window.location.href = data.url;
    } catch (e2) {
      setErr(e2.message || 'Network error — please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="whop-overlay" onClick={onClose}>
      <div className="whop-panel" onClick={(e) => e.stopPropagation()}>
        <button className="whop-x" onClick={onClose} aria-label="Close">&times;</button>

        <div className="whop-head">
          <div className="whop-title">{plan.name}</div>
          <div className="whop-price">
            {plan.price} <span>{plan.period}</span>
          </div>
        </div>

        {err && <div className="notice err">{err}</div>}

        <form onSubmit={go} style={{ marginTop: 14 }}>
          <div className="field">
            <label>Email address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <button className="btn" type="submit" disabled={busy} style={{ marginTop: 4 }}>
            {busy ? 'Redirecting…' : 'Continue to checkout →'}
          </button>
        </form>

        <p className="whop-fine">
          Secure checkout by Stripe. Prices in ZAR.
          Educational product; no guaranteed results.
        </p>
      </div>
    </div>
  );
}
