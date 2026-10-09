# TaahaFX Portal — clean website export

This contains the latest portal source, full-width forex VIDEO hero, Lottie files,
local MP4/WebM/poster assets, video-generation scripts, and a ready-built dist folder.
The standalone configuration does not require Replit or a pnpm workspace.

## Run locally
Install Node.js 22.12 or newer, then open a terminal in this folder:

```sh
npm install
npm run dev
```

## Build and preview
```sh
npm run build
npm run preview
```

The dist folder is the compiled frontend. Static hosting needs an index.html
fallback for client-side routes. To build under a subpath, set BASE_PATH at build time.

## What is included
- All current website source and public assets, including both forex hero video formats.
- Genuine local Lottie JSON animations and their player.
- Original api/itn.js payment relay and vercel.json from the supplied website.
- Standard dependency versions and standalone Vite configuration.
- A freshly verified production build in dist.

## Important backend/hosting notes
The portal still uses its existing externally hosted Supabase authentication,
functions, storage, and Stripe checkout. Those remote services, database contents,
student records, provider credentials, and account secrets are not part of this ZIP.
This is a source/asset export, not a backend or database migration.

The api/itn.js file is the original Vercel-specific PayFast relay; it is NOT executed
by npm run dev, npm run preview, or plain static hosting. Do not change the live host
or payment callback destinations without confirming their configuration and routing.
Check allowed origins, reset-password links, Discord return URLs, and payment
notifications before using a new domain. Admin actions still target the live backend.

The video is illustrative artwork, not a live forex feed. It loops muted, has
pause/play controls, and respects reduced-motion preferences.

## Optional: regenerate the video or Lottie artwork
The existing assets are ready to use. Regeneration is not needed to run the website.
With ffmpeg/ffprobe available:
```sh
node scripts/create-forex-video.mjs
node scripts/create-forex-animation.mjs
```

No node_modules, environment files, credentials, caches, repository history,
Replit-only configuration, or unrelated apps are included.
