// PM2 process file — runs the merged MaskGuard site on a single port (3000).
//
// Landing page and app are now ONE Next.js site:
//   /        → cinematic landing page (front door)
//   /app     → HeroSpotlight home ("Enter MaskGuard" lands here)
//   /detect  → live webcam detection
//   /insights, /about
//
// Backend services (Node gateway on :4000, Python inference on :8000) are
// still launched separately per the project README; this file only manages
// the web frontend.
module.exports = {
  apps: [
    {
      name: 'maskguard',
      script: 'npx',
      args: 'next start -H 0.0.0.0 -p 3000',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    },
  ],
};
