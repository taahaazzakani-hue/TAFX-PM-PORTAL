
// ── Backend configuration ───────────────────────────────────────────
const SUPABASE_URL = 'https://sicegpbjpulqbomkrrtn.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpY2VncGJqcHVscWJvbWtycnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNjAzNzcsImV4cCI6MjA5ODczNjM3N30.gVcFzYWcBq_C8INPC7u7VIszFFuSR4dOZYbinrrLt5s';

const API = `${SUPABASE_URL}/functions/v1/pm-api`;
const BOOKINGS_API = `${SUPABASE_URL}/functions/v1/pm-bookings`;
const SETTINGS_API = `${SUPABASE_URL}/functions/v1/pm-settings`;
const INTEREST_API = `${SUPABASE_URL}/functions/v1/pm-interest`;
const GATES_API = `${SUPABASE_URL}/functions/v1/pm-gates`;

// NOTE: Online payment gateways (PayFast/Paystack) were removed. Subscriptions
// are paid manually by EFT to the mentor; see payinfo.js for the details shown
// to students, and the admin panel's "Record payment" for logging a payment.

export async function call(action, body = {}) {
  return post(API, action, body);
}

// 1v1 session bookings live in their own edge function (pm-bookings) so that
// booking changes never touch pm-api, which handles login for every user.
export async function callBookings(action, body = {}) {
  return post(BOOKINGS_API, action, body);
}

// Admin-editable portal content (recommended broker page) lives in pm_settings.
export async function callSettings(action, body = {}) {
  return post(SETTINGS_API, action, body);
}

// Private Mentorship interest from students not yet enrolled.
export async function callInterest(action, body = {}) {
  return post(INTEREST_API, action, body);
}

// Content gating — which sections a student has unlocked.
export async function callGates(action, body = {}) {
  return post(GATES_API, action, body);
}

async function post(url, action, body) {
  const res = await fetch(url, {
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
