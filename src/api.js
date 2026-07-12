// ── Backend configuration ───────────────────────────────────────────
const SUPABASE_URL = 'https://sicegpbjpulqbomkrrtn.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpY2VncGJqcHVscWJvbWtycnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNjAzNzcsImV4cCI6MjA5ODczNjM3N30.gVcFzYWcBq_C8INPC7u7VIszFFuSR4dOZYbinrrLt5s';

const API = `${SUPABASE_URL}/functions/v1/pm-api`;

// Start a PayFast checkout — returns { url } to redirect the student to
export async function paystackInit(payload) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/pm-payfast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY },
    body: JSON.stringify({ action: 'init', ...payload }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || d.error) throw new Error(d.error || 'Could not start the payment.');
  return d;
}

export async function call(action, body = {}) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await res.json().catch(() => ({ error: 'Network error' }));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

const SKEY = 'ta_pm_session';
export function saveSession(user) { localStorage.setItem(SKEY, JSON.stringify(user)); }
export function loadSession() {
  try { return JSON.parse(localStorage.getItem(SKEY)); } catch { return null; }
}
export function clearSession() { localStorage.removeItem(SKEY); }

// Refresh current user from server (e.g. after level changes)
export async function refreshMe(user_id) {
  try { const d = await call('refresh_me', { user_id }); return d.user; } catch { return null; }
}

// ── Supabase Storage upload (journal images, avatars) ──
export async function uploadImage(file, folder = 'journal') {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/pm-journal/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': file.type || 'image/jpeg', 'x-upsert': 'true' },
    body: file,
  });
  if (!res.ok) throw new Error('Upload failed');
  return `${SUPABASE_URL}/storage/v1/object/public/pm-journal/${path}`;
}

// ── Generic file upload (PDFs, docs) to Supabase Storage ──
export async function uploadFile(file, folder = 'lesson-pdfs') {
  const safeName = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/pm-journal/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' },
    body: file,
  });
  if (!res.ok) throw new Error('Upload failed');
  return `${SUPABASE_URL}/storage/v1/object/public/pm-journal/${path}`;
}
