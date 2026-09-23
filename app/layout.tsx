import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MaskGuard — Real-time mask detection, done privately',
  description:
    'MaskGuard checks for face masks live in your browser using an on-device-style pipeline — nothing about your video is ever stored.',
};

/**
 * Root layout — intentionally minimal.
 *
 * The site has two "faces":
 *   - "/"        → the cinematic landing page, which owns its own logo, cursor
 *                   and footer, so it must NOT inherit the app Nav/Footer.
 *   - "/app", "/detect", "/insights", "/about" → the real app, whose shared
 *                   Nav + Footer live in app/(app)/layout.tsx (the "(app)"
 *                   route group).
 *
 * Because of that split, the root layout only provides <html>/<body> +
 * global styles. Each route group layers on its own chrome.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-base text-ink antialiased selection:bg-accent-soft">
        {children}
      </body>
    </html>
  );
}
