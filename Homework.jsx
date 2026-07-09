import React, { useState } from 'react';
import { call, uploadImage, saveSession } from './api.js';
import PasswordField from './PasswordField.jsx';

export default function Profile({ user, onUpdated }) {
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

      <ChangePassword user={user} />
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
