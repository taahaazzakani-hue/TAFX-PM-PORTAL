/* ============================================================
   src/WhopCheckout.jsx
   Whop payment checkout for the TAFX PM Portal
   React 18 + Vite — no npm install needed, loads via CDN script
   ============================================================ */

import { useState, useEffect, useRef } from "react";

/* ---- Plan IDs (live, tested) ---- */
export const WHOP_PLANS = {
  scalping: { id: "plan_PHCrwo2T5Jpkk", name: "TA Scalping Model",  price: "$65",  period: "once-off" },
  course:   { id: "plan_jo5IXaCTR7elV", name: "TaahaFX Course",     price: "$85",  period: "once-off" },
  private:  { id: "plan_FEC2iW8kQjacB", name: "Private Mentorship", price: "$55",  period: "per month" },
  oneonone: { id: "plan_yVdJoE8KOlzRE", name: "1-to-1 Mentorship",  price: "$125", period: "per month" },
};

/* ---- Loads Whop's script once, app-wide ---- */
function useWhopLoader() {
  const [ready, setReady] = useState(
    typeof window !== "undefined" && !!window.wco
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.wco) { setReady(true); return; }

    const existing = document.querySelector('script[data-whop-loader]');
    if (existing) {
      existing.addEventListener("load", () => setReady(true));
      return;
    }

    const s = document.createElement("script");
    s.src = "https://js.whop.com/static/checkout/loader.js";
    s.async = true;
    s.defer = true;
    s.setAttribute("data-whop-loader", "true");
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);

  return ready;
}

/* ============================================================
   <WhopCheckoutModal />
   Opens checkout in an overlay.

   <WhopCheckoutModal
     planKey="oneonone"
     email={student.email}
     onClose={() => setShowUpgrade(false)}
   />
   ============================================================ */
export function WhopCheckoutModal({ planKey, email, onClose }) {
  const ready = useWhopLoader();
  const mountRef = useRef(null);
  const plan = WHOP_PLANS[planKey];

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    if (!ready || !plan || !mountRef.current) return;

    const el = document.createElement("div");
    el.setAttribute("data-whop-checkout-plan-id", plan.id);
    el.setAttribute("data-whop-checkout-theme", "dark");
    el.setAttribute("data-whop-checkout-theme-accent-color", "gold");
    if (email) el.setAttribute("data-whop-checkout-prefill-email", email);

    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(el);

    if (window.wco?.createCheckout) {
      try { window.wco.createCheckout(el); } catch (_) {}
    }
  }, [ready, plan, email]);

  if (!plan) return null;

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

        <div ref={mountRef} className="whop-mount">
          {!ready && <div className="whop-loading">Loading secure checkout…</div>}
        </div>

        <p className="whop-fine">
          Secure checkout by Whop. Prices charged in USD — your bank converts at its own rate.
          Educational product; no guaranteed results.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   <WhopCheckoutInline />
   Renders the payment form directly in the page.

   <WhopCheckoutInline planKey="private" email={student.email} />
   ============================================================ */
export function WhopCheckoutInline({ planKey, email }) {
  const ready = useWhopLoader();
  const mountRef = useRef(null);
  const plan = WHOP_PLANS[planKey];

  useEffect(() => {
    if (!ready || !plan || !mountRef.current) return;

    const el = document.createElement("div");
    el.setAttribute("data-whop-checkout-plan-id", plan.id);
    el.setAttribute("data-whop-checkout-theme", "dark");
    el.setAttribute("data-whop-checkout-theme-accent-color", "gold");
    if (email) el.setAttribute("data-whop-checkout-prefill-email", email);

    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(el);

    if (window.wco?.createCheckout) {
      try { window.wco.createCheckout(el); } catch (_) {}
    }
  }, [ready, plan, email]);

  if (!plan) return null;

  return (
    <div ref={mountRef} className="whop-mount">
      {!ready && <div className="whop-loading">Loading secure checkout…</div>}
    </div>
  );
}

/* ============================================================
   <UpgradeCard />
   A ready-made card for the Dashboard / PM page.

   <UpgradeCard
     planKey="oneonone"
     email={student.email}
     blurb="One private 20–30 minute class every trading day…"
     bullets={["Daily private class", "Personal trading plan", "Journal review"]}
   />
   ============================================================ */
export function UpgradeCard({ planKey, email, blurb, bullets = [] }) {
  const [open, setOpen] = useState(false);
  const plan = WHOP_PLANS[planKey];
  if (!plan) return null;

  return (
    <>
      <div className="whop-card">
        <div className="whop-card-top">
          <div className="whop-card-name">{plan.name}</div>
          <div className="whop-card-price">
            {plan.price}<span>{plan.period}</span>
          </div>
        </div>

        {blurb && <p className="whop-card-blurb">{blurb}</p>}

        {bullets.length > 0 && (
          <ul className="whop-card-list">
            {bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        )}

        <button className="whop-card-btn" onClick={() => setOpen(true)}>
          Upgrade Now
        </button>
      </div>

      {open && (
        <WhopCheckoutModal
          planKey={planKey}
          email={email}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
