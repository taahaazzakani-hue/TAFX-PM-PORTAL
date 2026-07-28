import React, { useEffect, useState } from 'react';
import { callSettings } from './api.js';

/* The recommended-broker page. HFM publishes no API for their account lineup,
   so this is admin-editable content stored in pm_settings under 'brokers'
   rather than anything synced. Taaha edits it when HFM changes something. */

const BLANK_ACCOUNT = { id: '', name: '', best_for: '', min_deposit: '', blurb: '', recommended: false };

export default function Broker() {
  const [cfg, setCfg] = useState(undefined);

  useEffect(() => {
    callSettings('settings_get', { key: 'brokers' })
      .then((d) => setCfg(d.value))
      .catch(() => setCfg(null));
  }, []);

  if (cfg === undefined) return <div className="spinner" />;
  if (!cfg) {
    return (
      <div className="empty">
        <div className="big serif">Nothing here yet</div>
        <div>Your mentor hasn't published broker guidance yet.</div>
      </div>
    );
  }

  const b = cfg.broker || {};
  const accounts = cfg.accounts || [];

  return (
    <div>
      <div className="card">
        <h3 className="serif" style={{ fontSize: 20 }}>{b.name || cfg.headline}</h3>
        {b.regulator && <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>{b.regulator}</div>}
        {b.platforms && <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{b.platforms}</div>}
        {cfg.intro && <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.7, marginTop: 12 }}>{cfg.intro}</p>}
        {b.cta_url && (
          <a className="btn" href={b.cta_url} target="_blank" rel="noreferrer"
            style={{ width: 'auto', padding: '12px 24px', marginTop: 16, display: 'inline-block', textDecoration: 'none' }}>
            {b.cta_label || 'Open an account'}
          </a>
        )}
      </div>

      {accounts.length > 0 && (
        <>
          <h3 className="serif" style={{ margin: '26px 0 12px' }}>Which account should you open?</h3>
          {accounts.map((a) => (
            <div key={a.id || a.name} className="card"
              style={a.recommended ? { borderColor: 'var(--gold-soft)' } : undefined}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>{a.name}</h3>
                {a.recommended && <span className="status-tag s-approved">Recommended</span>}
                {a.min_deposit && (
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-faint)' }}>
                    Min deposit: {a.min_deposit}
                  </span>
                )}
              </div>
              {a.best_for && (
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--gold-soft)', marginTop: 8 }}>
                  {a.best_for}
                </div>
              )}
              {a.blurb && <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.65, marginTop: 8 }}>{a.blurb}</p>}
            </div>
          ))}
        </>
      )}

      {cfg.extras && (
        <div className="notice info" style={{ marginTop: 18 }}>{cfg.extras}</div>
      )}
      {cfg.footnote && (
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 16, lineHeight: 1.6 }}>
          {cfg.footnote}{cfg.checked_on ? ` Last reviewed ${cfg.checked_on}.` : ''}
        </p>
      )}
      {cfg.disclosure && (
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 10, lineHeight: 1.6, fontStyle: 'italic' }}>
          {cfg.disclosure}
        </p>
      )}
    </div>
  );
}

/* ---------- admin editor (mounted from Admin.jsx) ---------- */

export function BrokerAdmin({ admin }) {
  const [cfg, setCfg] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    callSettings('settings_get', { key: 'brokers' })
      .then((d) => setCfg(d.value || { broker: {}, accounts: [] }))
      .catch((e) => { setErr(e.message); setCfg({ broker: {}, accounts: [] }); });
  }, []);

  if (cfg === undefined) return <div className="spinner" />;

  const set = (patch) => setCfg({ ...cfg, ...patch });
  const setB = (patch) => setCfg({ ...cfg, broker: { ...(cfg.broker || {}), ...patch } });
  const setAcc = (i, patch) => {
    const next = [...(cfg.accounts || [])];
    next[i] = { ...next[i], ...patch };
    setCfg({ ...cfg, accounts: next });
  };
  const move = (i, dir) => {
    const next = [...(cfg.accounts || [])];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setCfg({ ...cfg, accounts: next });
  };

  async function save() {
    setBusy(true); setErr(''); setMsg('');
    try {
      const value = { ...cfg, checked_on: new Date().toISOString().slice(0, 10) };
      await callSettings('admin_settings_set', { admin_id: admin.id, key: 'brokers', value });
      setCfg(value);
      setMsg('Saved — students see this immediately.');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const b = cfg.broker || {};
  const accounts = cfg.accounts || [];

  return (
    <div>
      <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginBottom: 16 }}>
        HFM doesn't publish an API for their account lineup, so this page is maintained by hand.
        Whenever HFM changes an account, edit it here and hit save — students see it straight away.
      </p>

      <div className="card">
        <h3 className="serif">Broker</h3>
        <div className="field"><label>Name</label>
          <input value={b.name || ''} onChange={(e) => setB({ name: e.target.value })} /></div>
        <div className="field"><label>Regulator line</label>
          <input value={b.regulator || ''} onChange={(e) => setB({ regulator: e.target.value })} /></div>
        <div className="field"><label>Platforms</label>
          <input value={b.platforms || ''} onChange={(e) => setB({ platforms: e.target.value })} /></div>
        <div className="field"><label>Your referral link</label>
          <input value={b.cta_url || ''} onChange={(e) => setB({ cta_url: e.target.value })} /></div>
        <div className="field"><label>Button text</label>
          <input value={b.cta_label || ''} onChange={(e) => setB({ cta_label: e.target.value })} /></div>
        <div className="field"><label>Intro paragraph</label>
          <textarea rows={4} value={cfg.intro || ''} onChange={(e) => set({ intro: e.target.value })} /></div>
      </div>

      <h3 className="serif" style={{ margin: '26px 0 12px' }}>Accounts ({accounts.length})</h3>
      {accounts.map((a, i) => (
        <div key={i} className="card">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <b style={{ flex: 1 }}>{a.name || 'Untitled account'}</b>
            <button className="mini-btn" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
            <button className="mini-btn" onClick={() => move(i, 1)} disabled={i === accounts.length - 1}>↓</button>
            <button className="mini-btn" onClick={() => {
              if (confirm(`Remove the ${a.name || 'this'} account from the page?`)) {
                set({ accounts: accounts.filter((_, j) => j !== i) });
              }
            }}>Remove</button>
          </div>
          <div className="field"><label>Name</label>
            <input value={a.name || ''} onChange={(e) => setAcc(i, { name: e.target.value })} /></div>
          <div className="field"><label>Best for</label>
            <input value={a.best_for || ''} onChange={(e) => setAcc(i, { best_for: e.target.value })} /></div>
          <div className="field"><label>Minimum deposit</label>
            <input value={a.min_deposit || ''} onChange={(e) => setAcc(i, { min_deposit: e.target.value })} /></div>
          <div className="field"><label>Description</label>
            <textarea rows={3} value={a.blurb || ''} onChange={(e) => setAcc(i, { blurb: e.target.value })} /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={!!a.recommended} style={{ width: 'auto' }}
              onChange={(e) => setAcc(i, { recommended: e.target.checked })} />
            Mark as recommended
          </label>
        </div>
      ))}

      <button className="btn ghost" style={{ width: 'auto', padding: '10px 18px' }}
        onClick={() => set({ accounts: [...accounts, { ...BLANK_ACCOUNT }] })}>
        + Add an account
      </button>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="field"><label>Extra note (HFcopy, Islamic accounts, anything else)</label>
          <textarea rows={3} value={cfg.extras || ''} onChange={(e) => set({ extras: e.target.value })} /></div>
        <div className="field"><label>Footnote</label>
          <textarea rows={2} value={cfg.footnote || ''} onChange={(e) => set({ footnote: e.target.value })} /></div>
        <div className="field"><label>Referral disclosure &amp; risk warning</label>
          <textarea rows={3} value={cfg.disclosure || ''} onChange={(e) => set({ disclosure: e.target.value })} /></div>
      </div>

      {err && <div className="notice err">{err}</div>}
      {msg && <div className="notice ok">{msg}</div>}

      <button className="btn" style={{ width: 'auto', padding: '12px 26px', marginTop: 14 }} onClick={save} disabled={busy}>
        {busy ? 'Saving…' : 'Save & publish'}
      </button>
    </div>
  );
}
