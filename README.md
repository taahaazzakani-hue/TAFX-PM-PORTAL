# TaahaFX Portal — clean local website

This export contains the latest portal source, design and active hero video.
It is standalone: no Replit account, workspace libraries, environment variables
or globally installed Vite are required.

## Run locally (Windows, macOS or Linux)

1. Install Node.js **22.12 or newer** (Node 20.19 also works).
2. Extract the ZIP and open a terminal inside the `TAFX-Portal` folder.
3. Run:

   ```sh
   npm install
   npm run dev
   ```

4. Open **http://127.0.0.1:5173** in your browser.

Keep that terminal running. Press Ctrl+C to stop the website.
Do not open `index.html` by double-clicking it: React needs the local server.
If port 5173 is already in use, run `npm run dev -- --port 5174` instead.

If you prefer pnpm, use `pnpm install` and `pnpm dev`. A pnpm lockfile is included.

## Build and test the production version

```sh
npm run build
npm run preview
```

Open **http://127.0.0.1:4173**. The `dist/` folder contains the built website.
It is included for convenience, but rebuild it whenever you change the source.
Do not double-click `dist/index.html`; serve it using the preview command.

## Hero video playback

The hero video starts automatically, stays muted, and loops the full clip.
There is no pause button or native video control bar. The same video is used
on the sign-in screen and inside the portal, without switching sources on resize.
Playback resumes when you return to the tab.

Browsers can suspend videos in background tabs or restrict autoplay to save
power. If autoplay is initially blocked, clicking or pressing a key on the page
retries playback.

## Online services and data

The website runs on your computer, but it still connects to the existing hosted
Supabase backend for accounts, lessons, journals, bookings and other portal data.
Payments, Discord, externally hosted course images/videos and Google Fonts also
need internet access and their existing service configuration.

This ZIP does **not** include the hosted database, private account data, server
secrets, Stripe/Discord server functions or a replacement payment-webhook server.
It does not create an offline database or local test accounts. Data changes made
after signing in can affect the existing online portal, so do not use real
payments or delete live records while testing locally.

Some authentication/reset flows may require the local origin to be allowed in
the existing backend configuration. That is separate from starting this website.
Publishing to a new host also requires SPA routing and payment notification /
redirect configuration; this frontend ZIP alone is not a full backend migration.

## Included / excluded

- Included: current React source, styles, favicons, active MP4/WebM hero video,
  poster, standalone config, lockfile and built website.
- Excluded: node_modules, Replit tooling, workspace packages, caches, screenshots,
  old ZIPs, unused hero video variants, private configuration and the 60 MB
  high-bitrate video upload.

## Optional: regenerate the video

The included videos are ready to use; FFmpeg is **not** needed to run the website.
To regenerate them from your original source, install FFmpeg and run:

```sh
node scripts/create-forex-video.mjs "/path/to/your/original-video.mp4"
npm run build
```

The original upload is not included to keep the ZIP small.
