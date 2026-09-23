'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ScanFace, Menu, X } from 'lucide-react';

/**
 * Fixed pill-shaped nav that floats over the hero.
 *
 * Structure:
 *   - Left:   brand mark (icon + wordmark).
 *   - Center: glass-strong pill with route links. Active route gets a solid
 *             white/70 pill so it reads clearly against the blurred glass.
 *   - Right:  secondary "Try It Live" button — outline, not filled, so the
 *             hero's own gradient CTA stays the strongest visual pull on the
 *             page. Two filled CTAs would compete.
 *   - Mobile: hamburger opens a full-screen glass-strong overlay with the
 *             same links stacked large.
 *
 * Note: this nav is rendered globally from app/layout.tsx, so /detect and
 * /insights inherit it too. Their page content is unchanged; they just get
 * the nicer chrome for free.
 */
// Note: the app home (HeroSpotlight) now lives at "/app" — "/" is the
// cinematic landing page. So "How it works" and the brand mark point at
// "/app", keeping the app's own navigation self-consistent.
const links = [
  { href: '/', label: 'Landing' },
  { href: '/app', label: 'How it works' },
  { href: '/detect', label: 'Live Detection' },
  { href: '/insights', label: 'Insights' },
  { href: '/about', label: 'About' },
];

export default function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed left-0 right-0 top-0 z-[100] flex items-center justify-between p-4 sm:p-5"
        aria-label="Primary"
      >
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 text-ink"
          onClick={() => setMobileOpen(false)}
        >
          <ScanFace size={22} className="text-ink" aria-hidden="true" />
          <span className="font-display text-2xl italic text-ink">MaskGuard</span>
        </Link>

        {/* Center pill — desktop only */}
        <div className="glass-strong absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full px-2 py-2 md:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  active
                    ? 'rounded-full bg-white/70 px-4 py-1.5 text-sm font-medium text-ink shadow-sm'
                    : 'rounded-full px-4 py-1.5 text-sm font-medium text-inkmuted transition-colors hover:bg-accent/10 hover:text-accent'
                }
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        {/* Right CTA — desktop */}
        <Link
          href="/detect"
          className="hidden rounded-full border border-line/60 px-6 py-2.5 text-sm font-semibold text-ink transition hover:bg-white/60 md:block"
        >
          Try It Live
        </Link>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="glass rounded-full p-2.5 text-ink md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Full-screen mobile overlay */}
      {mobileOpen && (
        <div
          className="glass-strong fixed inset-0 z-[99] flex flex-col items-center justify-center gap-6 px-6 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`font-display text-3xl italic transition-colors ${
                  active ? 'text-ink' : 'text-inkmuted hover:text-accent'
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </Link>
            );
          })}
          <Link
            href="/detect"
            onClick={() => setMobileOpen(false)}
            className="mt-4 rounded-full bg-brand-gradient px-8 py-3 text-base font-medium text-white shadow-glow"
          >
            Try It Live
          </Link>
        </div>
      )}
    </>
  );
}
