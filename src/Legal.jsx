import React from 'react';
import { LOGO } from './assets.js';

const S = ({ t, children }) => (
  <div style={{ marginBottom: 22 }}>
    <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{t}</h2>
    <div style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.65 }}>{children}</div>
  </div>
);

const CONTENT = {
  disclaimer: {
    title: 'Risk Disclaimer',
    body: (
      <>
        <S t="Educational content only">
          TA Forex Institute provides <b>educational content only</b> — video courses, mentorship, homework and journaling tools intended to teach concepts related to trading. Nothing on this platform constitutes financial, investment, legal or tax advice, and nothing should be interpreted as a recommendation to buy, sell or hold any financial instrument.
        </S>
        <S t="Not a financial services provider">
          We are not a licensed financial services provider, broker, or fund manager. We do not accept, hold, manage or invest client funds. We do not execute trades on behalf of any student, and we do not sell trade signals. Any trading decision you make is entirely your own, made with your own capital, at your own broker, at your own risk.
        </S>
        <S t="Trading involves substantial risk">
          Trading foreign exchange and other leveraged products carries a high level of risk and is not suitable for everyone. <b>The majority of retail traders lose money.</b> You can lose some or all of your invested capital; never trade with money you cannot afford to lose. Past performance — whether of markets, mentors or other students — is not indicative of future results, and <b>no outcome, income or profit is guaranteed or implied</b>. All outcomes depend entirely on your own decisions, discipline and market conditions.
        </S>
        <S t="Personal responsibility">
          Before trading, consider your objectives, financial situation and experience, and if necessary seek advice from an independent, licensed financial adviser. By using this platform you accept full responsibility for your own decisions and outcomes.
        </S>
      </>
    ),
  },
  terms: {
    title: 'Terms of Service',
    body: (
      <>
        <S t="1. The service">
          TA Forex Institute ("we", "us") operates this private mentorship portal, which provides subscription access to educational video courses, mentorship feedback, homework and journaling tools ("the Service"). The Service is <b>educational only</b>: mentorship is teaching and feedback on your learning — it is <b>not</b> trade signals, not account management, not portfolio management, and not financial advice. <b>No results, profits or income are guaranteed.</b> Our Risk Disclaimer forms part of these terms.
        </S>
        <S t="2. Accounts">
          You must provide accurate registration details and keep your login credentials confidential. Accounts are personal: one account per student, for use on one device at a time, and access may not be shared, resold or redistributed. We may approve, decline, suspend or terminate accounts to protect the integrity of the Service, including for non-payment or sharing of content.
        </S>
        <S t="3. Subscription and billing">
          Access to the Private Mentorship is R800 per month, payable in advance by EFT (bank transfer) to the account we provide in the portal. There is no automatic or online billing — you pay each month manually, and once your mentor confirms the transfer your access is extended for that month. If a payment is not received by its due date, access is paused until the account is settled.
        </S>
        <S t="4. Cancellation">
          There is no automatic billing, so cancelling is simple: just let your mentor know, or stop paying the next month. Nothing is charged automatically. Your access continues until the end of the period you have already paid for, after which it stops. Our Refund Policy governs refunds.
        </S>
        <S t="5. Intellectual property">
          All course videos, documents, materials and platform content are our intellectual property (or licensed to us) and are provided for your personal, non-commercial use only. Downloading, recording, copying, publishing or sharing any content outside the platform is prohibited and grounds for immediate termination without refund.
        </S>
        <S t="6. No advice; limitation of liability">
          We provide education, not advice. To the maximum extent permitted by law, we are not liable for any trading losses, loss of profit, or indirect or consequential loss arising from your use of the Service or from decisions you make. Our total liability for any claim is limited to the subscription fees you paid in the three months preceding the claim. Nothing in these terms limits rights you have under the Consumer Protection Act that cannot lawfully be limited.
        </S>
        <S t="7. General">
          These terms are governed by the laws of the Republic of South Africa. We may update these terms from time to time; continued use of the Service after an update constitutes acceptance. For questions, contact your mentor through the portal.
        </S>
      </>
    ),
  },
  refunds: {
    title: 'Refund Policy',
    body: (
      <>
        <S t="Digital subscription">
          The Private Mentorship is a digital subscription service. Because access to all course content is provided immediately on payment, subscription fees are generally non-refundable once a billing period has begun.
        </S>
        <S t="First-time subscribers">
          If you are a new student and the Service is not what you expected, contact us within 7 days of your first payment and before completing a substantial portion of the content, and we will review your request for a refund of that first payment in good faith.
        </S>
        <S t="Renewals and cancellation">
          Each month is paid manually in advance, so a month already paid for is not refundable. Because nothing is billed automatically, you are never charged for a month you don't want — simply don't pay the next month and your access ends when the paid period runs out. If you paid in error (for example paying twice for the same month), contact us and verified errors will be refunded in full.
        </S>
        <S t="How to request">
          Send your request, with the email address on your account and the payment reference, to your mentor via the portal or the contact details provided at sign-up. Approved refunds are returned to the original payment method within 7–14 business days.
        </S>
      </>
    ),
  },
};

export function LegalPage({ page }) {
  const c = CONTENT[page] || CONTENT.disclaimer;
  return (
    <div style={{ minHeight: '100vh', padding: '48px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)', padding: '40px 42px' }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <img src={LOGO} alt="TA" style={{ width: 56 }} />
          <div style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--gold-soft)', marginTop: 8 }}>TA Forex Institute</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginTop: 12 }}>{c.title}</h1>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>Last updated: July 2026</div>
        </div>
        {c.body}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 30, flexWrap: 'wrap' }}>
          <a href="/" style={{ color: 'var(--gold-soft)', fontSize: 13, fontWeight: 600 }}>← Back to portal</a>
          {Object.keys(CONTENT).filter((k) => k !== page).map((k) => (
            <a key={k} href={`?page=${k}`} style={{ color: 'var(--ink-faint)', fontSize: 13 }}>{CONTENT[k].title}</a>
          ))}
        </div>
      </div>
    </div>
  );
}

// NOTE: The online-checkout consent modal (PaymentConsent) was removed together
// with the PayFast/Paystack gateways. Payment is now a manual EFT; the banking
// details shown to students live in PayInfo.jsx / payinfo.js.

export function LegalFooter() {
  return (
    <div className="legal-footer" style={{ maxWidth: 460, margin: '26px auto 0', textAlign: 'center', padding: '0 16px' }}>
      <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', lineHeight: 1.6 }}>
        TA Forex Institute provides educational content only — not financial advice. We do not manage funds, execute trades or sell signals. Trading involves substantial risk of loss.
      </div>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 10, fontSize: 12 }}>
        <a href="?page=disclaimer" style={{ color: 'var(--ink-faint)' }}>Risk Disclaimer</a>
        <a href="?page=terms" style={{ color: 'var(--ink-faint)' }}>Terms of Service</a>
        <a href="?page=refunds" style={{ color: 'var(--ink-faint)' }}>Refund Policy</a>
      </div>
    </div>
  );
}
