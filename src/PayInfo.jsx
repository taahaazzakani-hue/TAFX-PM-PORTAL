import React, { useState } from 'react';
import { BANK, FEE_OF } from './payinfo.js';

// A copy-able row of banking detail
function Row({ label, value, copyable }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(String(value)); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch {}
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
      <div style={{ fontSize: 12, color: 'var(--ink-faint)', width: 120, flex: 'none' }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: 14, flex: 1, wordBreak: 'break-word' }}>{value}</div>
      {copyable && (
        <button className="mini-btn" style={{ margin: 0, flex: 'none' }} onClick={copy}>{copied ? '✓ Copied' : 'Copy'}</button>
      )}
    </div>
  );
}

// The banking-details card. `plan` = 'pm' | '1v1'. `due` optional date string.
export function BankDetailsCard({ plan = 'pm', due, overdue }) {
  const fee = FEE_OF(plan);
  const planName = plan === '1v1' ? '1v1 Mentorship' : 'Private Mentorship';
  return (
    <div>
      <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 14 }}>
        Pay your <b>R{fee}</b> monthly {planName} fee by EFT to the account below.
        {due && (overdue
          ? <> Your access was paused on <b>{due}</b> and reopens as soon as your payment is recorded.</>
          : <> This is due on <b>{due}</b>.</>)}
        {' '}Once you've paid, your mentor will mark it received and your access continues uninterrupted.
      </div>
      <div style={{ background: 'var(--panel-2)', borderRadius: 12, padding: '4px 16px 12px' }}>
        <Row label="Amount" value={`R${fee}.00`} copyable />
        <Row label="Account holder" value={BANK.holder} />
        <Row label="Bank" value={BANK.bank} />
        <Row label="Account number" value={BANK.accountNumber} copyable />
        <Row label="Account type" value={BANK.accountType} />
        <Row label="Branch code" value={BANK.branchCode} copyable />
        <Row label="Reference" value={BANK.reference} copyable />
      </div>
      {BANK.confirmTo
        ? <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 12 }}>After paying, send proof to <b>{BANK.confirmTo}</b> so your mentor can activate your access faster.</div>
        : <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 12 }}>After paying, let your mentor know so they can activate your access faster.</div>}
    </div>
  );
}

// Modal wrapper around the card.
export function BankModal({ plan = 'pm', due, overdue, onClose }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <h3 className="serif">How to pay</h3>
        <BankDetailsCard plan={plan} due={due} overdue={overdue} />
        <div className="modal-actions" style={{ marginTop: 18 }}>
          <button className="btn" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}
