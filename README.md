# TA Forex Institute — Private Mentorship Portal

A private, invite-approved video mentorship portal (Beginner / Intermediate / Advanced)
with Bunny Stream video, PDF notes, per-course progress tracking, an admin panel,
and automatic emails via Resend.

## Deploy (Vercel)
1. Push this folder to a GitHub repo (or drag-drop into Vercel).
2. Framework preset: **Vite**. Build command: `npm run build`. Output dir: `dist`.
3. Deploy. That's it — the backend (Supabase) is already live.

## Local dev
```
npm install
npm run dev
```

The Supabase URL + public key are already wired in `src/api.js`.
All sensitive logic (passwords, emails, admin actions) lives server-side in the
`pm-api` Supabase Edge Function — nothing secret is in this frontend.
