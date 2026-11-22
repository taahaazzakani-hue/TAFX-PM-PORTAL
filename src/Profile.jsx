import React, { useState, useEffect } from 'react';
import { call, uploadImage, saveSession, callSubs } from './api.js';
import PasswordField from './PasswordField.jsx';

export default function Profile({ user, onUpdated, initialNotice }) {
  const [f, setF] = useState({ name: user.name, phone: user.phone || '', avatar_url: user.avatar_url || '' });
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  async function uploadAvatar(ev) {
    const file = ev.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { const url = await uploadImage(file, 'avatars'); setF((s) => ({ ...s, avatar_url: url })); }
    catch { setMsg({ t: 'err', m: 'Upload failed.' }); } finally { setUploading(false); }
  }
  async function save() {
    setSaving(true); setMsg(null);
    try {
      const d = await call('update_profile', { user_id: user.id, name: f.name, phone: f.phone, avatar_url: f.avatar_url });
      const merged = { ...user, ...d.user }; saveSession(merged); onUpdated && onUpdated(merged);
      setMsg({ t: 'ok', m: 'Profile updated.' });
    } catch (e) { setMsg({ t: 'err', m: e.message }); } finally { setSaving(false); }
  }

  return (
    <div style={{ maxWidth: 620 }}>
      {msg && <div className={`notice ${msg.t}`}>{msg.m}</div>}
      <div className="card">
        <h3>Your details</h3>
        <div className="hint">Update how you appear in the portal and on leaderboards.</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: 'var(--panel-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', border: '1px solid var(--line)' }}>
            {f.avatar_url ? <img src={f.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--ink-faint)' }}>{(f.name || '?')[0]}</span>}
          </div>
          <label className="btn ghost" style={{ width: 'auto', padding: '9px 16px', cursor: 'pointer' }}>
            {uploading ? 'Uploading…' : 'Change photo'}
            <input type="file" accept="image/*" onChange={uploadAvatar} style={{ display: 'none' }} disabled={uploading} />
          </label>
        </div>
        <div className="field"><label>Full name</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="field"><label>Email (contact your mentor to change)</label><input value={user.email} disabled style={{ opacity: 0.6 }} /></div>
        <div className="field"><label>Cell number</label><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <button className="btn" style={{ width: 'auto', padding: '11px 24px' }} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </div>

      <MyMembership user={user} />
      <DiscordLink user={user} onUpdated={onUpdated} initialNotice={initialNotice} />
      <ChangePassword user={user} />
    </div>
  );
}

/* ---------- THE STUDENT'S OWN MEMBERSHIP ---------- */
/* Read straight from Stripe, so it shows what is actually being charged
   rather than what the portal believes. A student can end a membership
   themselves; it always runs to the end of the period they have paid for, so
   nobody loses time they bought and no refund question arises. */
function MyMembership({ user }) {
  const [subs, setSubs] = useState(null);   // null = loading, false = unreachable
  const [ask, setAsk] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = () => callSubs('my_subs_list', { user_id: user.id, session_token: user.session_token })
    .then((d) => setSubs(d.subscriptions || []))
    .catch(() => setSubs(false));
  useEffect(() => { load(); }, [user.id]);

  async function confirmCancel() {
    setBusy(true);
    try {
      const d = await callSubs('my_subs_cancel', {
        user_id: user.id, session_token: user.session_token, subscription_id: ask.id,
      });
      setSubs(d.subscriptions || []);
      setMsg({ t: 'ok', m: `Your ${ask.label} has been cancelled. You keep full access until ${new Date(d.period_end).toLocaleDateString()}, and you won't be charged again.` });
      setAsk(null);
    } catch (e) {
      setMsg({ t: 'err', m: e.message });
    } finally { setBusy(false); }
  }

  // Nothing to show someone who pays by EFT or isn't on a plan.
  if (subs === false || (Array.isArray(subs) && subs.length === 0)) return null;

  return (
    <div className="card">
      <h3>Your membership</h3>
      <div className="hint">What you're subscribed to, straight from our payment provider.</div>

      {msg && <div className={`notice ${msg.t}`} style={{ marginBottom: 12 }}>{msg.m}</div>}

      {subs === null ? <div className="hint">Loading…</div> : subs.map((sub) => (
        <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 0', borderTop: '1px solid var(--line)' }}>
          <div style={{ flex: 1, minWidth: 170 }}>
            <div style={{ fontWeight: 600 }}>{sub.label}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
              {sub.currency === 'ZAR' ? 'R' : `${sub.currency} `}{sub.amount} a {sub.interval || 'month'}
              {sub.cancel_at_period_end
                ? ` · ends ${new Date(sub.period_end).toLocaleDateString()}`
                : ` · renews ${new Date(sub.period_end).toLocaleDateString()}`}
            </div>
          </div>
          {sub.cancel_at_period_end
            ? <span className="status-tag s-pending">Cancelled</span>
            : <button className="btn ghost" style={{ width: 'auto', padding: '9px 16px' }}
                onClick={() => { setMsg(null); setAsk(sub); }}>Cancel membership</button>}
        </div>
      ))}

      {ask && (
        <div className="modal-back" onClick={() => !busy && setAsk(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="serif">Cancel your {ask.label}?</h3>
            <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.75 }}>
              You'll keep full access until <b>{new Date(ask.period_end).toLocaleDateString()}</b>, the date you've
              paid up to. After that it stops and you won't be charged again. Nothing is refunded, and you can
              rejoin whenever you like.
            </p>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setAsk(null)} disabled={busy}>Stay subscribed</button>
              <button className="btn" style={{ width: 'auto', padding: '11px 20px' }}
                onClick={confirmCancel} disabled={busy}>
                {busy ? 'Cancelling…' : 'Yes, cancel it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DiscordLink({ user, onUpdated, initialNotice }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(initialNotice || null);

  async function link() {
    setBusy(true); setMsg(null);
    try {
      const d = await call('discord_link_start', { user_id: user.id });
      if (d.url) window.location.href = d.url;
      else setMsg({ t: 'err', m: 'Could not start Discord linking.' });
    } catch (e) { setMsg({ t: 'err', m: e.message }); setBusy(false); }
  }
  async function unlink() {
    if (!confirm('Unlink your Discord account? Your Private Mentorship / 1v1 Discord roles will be removed.')) return;
    setBusy(true); setMsg(null);
    try {
      await call('discord_unlink', { user_id: user.id });
      const merged = { ...user, discord_user_id: null }; saveSession(merged); onUpdated && onUpdated(merged);
      setMsg({ t: 'ok', m: 'Discord unlinked.' });
    } catch (e) { setMsg({ t: 'err', m: e.message }); } finally { setBusy(false); }
  }

  const linked = !!user.discord_user_id;
  return (
    <div className="card">
      <h3>Discord</h3>
      <div className="hint">
        Link your Discord account to automatically get the Private Mentorship / 1v1 roles on our server, kept in sync with your subscription.
      </div>
      {msg && <div className={`notice ${msg.t}`}>{msg.m}</div>}
      {linked ? (
        <>
          <div className="notice info" style={{ marginBottom: 12 }}>Your Discord account is linked.</div>
          <button className="btn ghost" style={{ width: 'auto', padding: '11px 24px' }} onClick={unlink} disabled={busy}>{busy ? 'Unlinking…' : 'Unlink Discord'}</button>
        </>
      ) : (
        <button className="btn" style={{ width: 'auto', padding: '11px 24px' }} onClick={link} disabled={busy}>{busy ? 'Redirecting…' : 'Link Discord'}</button>
      )}
    </div>
  );
}

function ChangePassword({ user }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true); setMsg(null);
    try { await call('change_password', { user_id: user.id, current, next }); setMsg({ t: 'ok', m: 'Password changed.' }); setCurrent(''); setNext(''); }
    catch (e) { setMsg({ t: 'err', m: e.message }); } finally { setBusy(false); }
  }
  return (
    <div className="card">
      <h3>Reset password</h3>
      <div className="hint">Enter your current password and choose a new one.</div>
      {msg && <div className={`notice ${msg.t}`}>{msg.m}</div>}
      <PasswordField value={current} onChange={(e) => setCurrent(e.target.value)} label="Current password" />
      <PasswordField value={next} onChange={(e) => setNext(e.target.value)} label="New password" autoComplete="new-password" minLength={6} />
      <button className="btn" style={{ width: 'auto', padding: '11px 24px' }} onClick={submit} disabled={busy || !current || !next}>{busy ? 'Updating…' : 'Update password'}</button>
    </div>
  );
}
