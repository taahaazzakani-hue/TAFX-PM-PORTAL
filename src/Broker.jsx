import React, { useEffect, useState } from 'react';
import { callSettings, uploadImage } from './api.js';

/* Recommended-broker page. HFM publishes no API for their account lineup or
   promotions, so everything here is admin-editable content stored in
   pm_settings under 'brokers'. Taaha edits it when HFM changes something.

   The page's job is to get a student into the RIGHT account, so accounts are
   presented as a ladder they climb rather than a menu they browse. Promotions
   (Shield 500) sit outside the ladder — a promo is not a tier, and conflating
   the two is how beginners end up in the wrong account. */

const BLANK_ACCOUNT = { name: '', best_for: '', min_deposit: '', blurb: '', recommended: false, image: '' };

const stepLabel = (accounts, i) => {
  const a = accounts[i];
  if (!a.recommended) return 'Later';
  const firstRec = accounts.findIndex((x) => x.recommended);
  return i === firstRec ? 'Start here' : 'Next step';
};

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
  const offer = cfg.offer || null;
  const cta = b.cta_url ? (
    <a className="btn" href={b.cta_url} target="_blank" rel="noreferrer"
      style={{ width: 'auto', padding: '13px 26px', display: 'inline-block', textDecoration: 'none' }}>
      {b.cta_label || 'Open an account'}
    </a>
  ) : null;

  return (
    <div>
      {/* hero */}
      <section className={`brk-hero brk-rise ${b.hero_image ? 'dark' : ''}`}>
        <div className="brk-hero-grid">
          <div>
            <div className="brk-eyebrow">Recommended broker</div>
            <h2>{b.name || 'Recommended broker'}</h2>
            {cfg.intro && <p>{cfg.intro}</p>}
            <div className="brk-meta">
              {b.regulator && <span className="brk-chip">{b.regulator}</span>}
              {b.platforms && <span className="brk-chip">{b.platforms}</span>}
            </div>
            <div style={{ marginTop: 22 }}>{cta}</div>
            {cfg.hero_caption && <p className="brk-caption">{cfg.hero_caption}</p>}
          </div>
          {b.hero_image && <img className="brk-shot" src={b.hero_image} alt="" />}
        </div>
      </section>

      {/* the ladder */}
      {accounts.length > 0 && (
        <>
          <div className="brk-section-head">
            <h3>Which account to open</h3>
            <span className="rule" />
          </div>
          <div className="brk-ladder">
            {accounts.map((a, i) => (
              <div key={i} className={`brk-rung brk-rise ${a.recommended ? 'on' : ''}`}
                style={{ animationDelay: `${Math.min(i, 5) * 55}ms` }}>
                <article className="brk-card">
                  <div className="brk-card-top">
                    <h3>{a.name}</h3>
                    <span className="brk-step">{stepLabel(accounts, i)}</span>
                    {a.min_deposit && <span className="brk-min">Min {a.min_deposit}</span>}
                  </div>
                  {a.best_for && <div className="brk-for">{a.best_for}</div>}
                  {a.blurb && <p>{a.blurb}</p>}
                  {a.image && <img className="brk-thumb" src={a.image} alt="" />}
                </article>
              </div>
            ))}
          </div>
        </>
      )}

      {/* promotion — deliberately outside the ladder */}
      {offer && offer.name && (
        <>
          <div className="brk-section-head">
            <h3>Current offer</h3>
            <span className="rule" />
          </div>
          <section className="brk-offer brk-rise">
            {offer.image && <img className="brk-offer-img" src={offer.image} alt="" />}
            <div className="brk-offer-body">
              <div className="brk-eyebrow">{offer.eyebrow || 'Promotion'}</div>
              <h3>{offer.name}</h3>
              {offer.blurb && <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, lineHeight: 1.75, marginTop: 12 }}>{offer.blurb}</p>}
              {cta && <div style={{ marginTop: 20 }}>{cta}</div>}
            </div>
            {(offer.terms || []).length > 0 && (
              <div className="brk-terms">
                <b>How it actually works</b>
                <ul>{offer.terms.map((t, i) => <li key={i}>{t}</li>)}</ul>
              </div>
            )}
          </section>
        </>
      )}

      {cfg.extras && <div className="notice info" style={{ marginTop: 22 }}>{cfg.extras}</div>}
      {cfg.footnote && (
        <p className="brk-fine">{cfg.footnote}{cfg.checked_on ? ` Last reviewed ${cfg.checked_on}.` : ''}</p>
      )}
      {cfg.disclosure && <p className="brk-fine" style={{ fontStyle: 'italic' }}>{cfg.disclosure}</p>}
    </div>
  );
}

/* ---------- admin editor ---------- */

function ImageField({ label, value, onChange, folder = 'broker' }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function pick(e) {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    if (!(f.type || '').startsWith('image/')) { setErr('Images only.'); return; }
    if (f.size > 10 * 1024 * 1024) { setErr('Keep it under 10MB.'); return; }
    setErr(''); setBusy(true);
    try { onChange(await uploadImage(f, folder)); }
    catch { setErr("Couldn't upload that."); }
    finally { setBusy(false); }
  }
  return (
    <div className="field">
      <label>{label}</label>
      {value && <img src={value} alt="" style={{ width: '100%', maxWidth: 300, borderRadius: 10, border: '1px solid var(--line)', marginBottom: 8, display: 'block' }} />}
      <input type="file" accept="image/*" onChange={pick} disabled={busy} />
      <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>
        {busy ? 'Uploading…' : value ? 'Upload a new one to replace it.' : 'Not set.'}
      </div>
      {value && <button className="mini-btn" style={{ marginTop: 6 }} onClick={() => onChange('')}>Remove image</button>}
      {err && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{err}</div>}
    </div>
  );
}

export function BrokerAdmin({ admin }) {
  const [cfg, setCfg] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    callSettings('settings_get', { key: 'brokers' })
      .then((d) => setCfg(d.value || { broker: {}, accounts: [], offer: {} }))
      .catch((e) => { setErr(e.message); setCfg({ broker: {}, accounts: [], offer: {} }); });
  }, []);

  if (cfg === undefined) return <div className="spinner" />;

  const set = (patch) => setCfg({ ...cfg, ...patch });
  const setB = (patch) => setCfg({ ...cfg, broker: { ...(cfg.broker || {}), ...patch } });
  const setO = (patch) => setCfg({ ...cfg, offer: { ...(cfg.offer || {}), ...patch } });
  const accounts = cfg.accounts || [];
  const offer = cfg.offer || {};
  const setAcc = (i, patch) => {
    const next = [...accounts]; next[i] = { ...next[i], ...patch }; set({ accounts: next });
  };
  const move = (i, d) => {
    const next = [...accounts]; const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]]; set({ accounts: next });
  };

  async function save() {
    setBusy(true); setErr(''); setMsg('');
    try {
      const value = { ...cfg, checked_on: new Date().toISOString().slice(0, 10) };
      await callSettings('admin_settings_set', { admin_id: admin.id, key: 'brokers', value });
      setCfg(value); setMsg('Published. Students see this now.');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const b = cfg.broker || {};

  return (
    <div>
      <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginBottom: 16 }}>
        HFM has no API for their account lineup or promotions, so this page is maintained by hand.
        Order matters — students read it top to bottom as the order to open accounts in.
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
        <ImageField label="Hero image (an HFM partner banner works well)"
          value={b.hero_image || ''} onChange={(v) => setB({ hero_image: v })} />
        <div className="field">
          <label>Caption under the hero — good place to put the leverage reality check</label>
          <textarea rows={3} value={cfg.hero_caption || ''} onChange={(e) => set({ hero_caption: e.target.value })} />
        </div>
      </div>

      <h3 className="serif" style={{ margin: '26px 0 12px' }}>Accounts ({accounts.length})</h3>
      {accounts.map((a, i) => (
        <div key={i} className="card">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <b style={{ flex: 1 }}>{i + 1}. {a.name || 'Untitled'}</b>
            <button className="mini-btn" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
            <button className="mini-btn" onClick={() => move(i, 1)} disabled={i === accounts.length - 1}>↓</button>
            <button className="mini-btn" onClick={() => {
              if (confirm(`Remove ${a.name || 'this account'} from the page?`)) set({ accounts: accounts.filter((_, j) => j !== i) });
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
          <ImageField label="Image for this account (optional)" value={a.image || ''} onChange={(v) => setAcc(i, { image: v })} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={!!a.recommended} style={{ width: 'auto' }}
              onChange={(e) => setAcc(i, { recommended: e.target.checked })} />
            Recommended — lights up the rung and gets a "start here / next step" label
          </label>
        </div>
      ))}
      <button className="btn ghost" style={{ width: 'auto', padding: '10px 18px' }}
        onClick={() => set({ accounts: [...accounts, { ...BLANK_ACCOUNT }] })}>+ Add an account</button>

      <h3 className="serif" style={{ margin: '26px 0 12px' }}>Current offer</h3>
      <div className="card">
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 12 }}>
          Shown separately from the ladder so students don't mistake a promotion for an account tier.
          Clear the name to hide the whole section.
        </p>
        <div className="field"><label>Eyebrow</label>
          <input value={offer.eyebrow || ''} onChange={(e) => setO({ eyebrow: e.target.value })} /></div>
        <div className="field"><label>Offer name</label>
          <input value={offer.name || ''} onChange={(e) => setO({ name: e.target.value })} /></div>
        <div className="field"><label>Description</label>
          <textarea rows={3} value={offer.blurb || ''} onChange={(e) => setO({ blurb: e.target.value })} /></div>
        <div className="field">
          <label>How it actually works — one line per bullet</label>
          <textarea rows={7} value={(offer.terms || []).join('\n')}
            onChange={(e) => setO({ terms: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} />
        </div>
        <ImageField label="Offer banner" value={offer.image || ''} onChange={(v) => setO({ image: v })} folder="broker-offer" />
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="field"><label>Extra note</label>
          <textarea rows={3} value={cfg.extras || ''} onChange={(e) => set({ extras: e.target.value })} /></div>
        <div className="field"><label>Footnote</label>
          <textarea rows={2} value={cfg.footnote || ''} onChange={(e) => set({ footnote: e.target.value })} /></div>
        <div className="field"><label>Referral disclosure &amp; risk warning</label>
          <textarea rows={3} value={cfg.disclosure || ''} onChange={(e) => set({ disclosure: e.target.value })} /></div>
      </div>

      {err && <div className="notice err">{err}</div>}
      {msg && <div className="notice ok">{msg}</div>}
      <button className="btn" style={{ width: 'auto', padding: '12px 26px', marginTop: 14 }} onClick={save} disabled={busy}>
        {busy ? 'Publishing…' : 'Save & publish'}
      </button>
    </div>
  );
}
