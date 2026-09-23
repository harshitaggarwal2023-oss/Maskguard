import Script from 'next/script';
import type { Metadata } from 'next';

/**
 * The cinematic MaskGuard landing page — now the site's front door at "/".
 *
 * This is a faithful port of the standalone Hono landing page: the exact same
 * markup, the same /static/landing.css + /static/landing.js, and the same
 * hero images. The ONLY behavioural change is that the two "Enter MaskGuard"
 * buttons now point to the internal "/app" route (the HeroSpotlight home)
 * instead of a separate localhost:3001 origin — so landing + app are one
 * site on one port.
 *
 * It intentionally lives under the ROOT layout (no app Nav/Footer): the
 * landing owns its own logo, custom cursor and footer.
 */

export const metadata: Metadata = {
  title: 'MaskGuard — real-time face-mask detection',
  description:
    'MaskGuard detects face masks in real time, right in your browser. Private by design — no video is ever recorded or stored.',
};

// Internal route the "Enter MaskGuard" buttons open. This used to be an
// absolute cross-origin URL (http://localhost:3001); now the app home lives
// at "/app" within this same site.
const APP_URL = '/app';

// Gallery images. Drop your 9 files into public/gallery/ using these exact
// names (or edit the paths below to match whatever you use). Order matters:
// it lines up with LABELS in landing.js — indices 0,1,3,4,6,7,8 render the
// "Mask" tag, indices 2 and 5 render "No mask".
const GALLERY_IMAGES: string[] = [
  '/gallery/mask1.png',
  '/gallery/mask2.png',
  '/gallery/nomask1.png',
  '/gallery/mask3.png',
  '/gallery/mask4.png',
  '/gallery/nomask2.png',
  '/gallery/mask5.png',
  '/gallery/mask6.png',
  '/gallery/mask7.png',
];

export default function LandingPage() {
  return (
    <>
      {/* Landing-only stylesheet + fonts. Scoped here so the app routes stay
          on their own Tailwind/globals styling. */}
      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
      />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin=""
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600&display=swap"
        rel="stylesheet"
      />
      <link href="/static/landing.css" rel="stylesheet" />

      <div id="scroll-spacer">
        {/* gradient mesh backdrop */}
        <div id="mesh" aria-hidden="true">
          <span className="blob b1" />
          <span className="blob b2" />
          <span className="blob b3" />
          <span className="blob b4" />
        </div>

        {/* custom cursor */}
        <div id="cursor" aria-hidden="true">
          <svg
            viewBox="0 0 46 46"
            width="46"
            height="46"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g className="ring">
              <circle cx="23" cy="23" r="21" fill="none" stroke="#fff" strokeWidth="2" />
              <circle cx="23" cy="23" r="3" fill="#fff" />
            </g>
          </svg>
        </div>

        {/* logo */}
        <a id="logo" href="/">
          <svg className="mark" viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#0EA5A0" />
                <stop offset="1" stopColor="#6D5EF0" />
              </linearGradient>
            </defs>
            <path
              d="M21 2 L37 8 V20 C37 31 30 38 21 41 C12 38 5 31 5 20 V8 Z"
              fill="none"
              stroke="#fff"
              strokeWidth="2.4"
            />
            <path
              d="M13 22 C15 26 27 26 29 22"
              fill="none"
              stroke="#fff"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <circle cx="15" cy="17" r="1.8" fill="#fff" />
            <circle cx="27" cy="17" r="1.8" fill="#fff" />
          </svg>
          <span className="word">MaskGuard</span>
        </a>

        {/* caption */}
        <div id="caption">
          Real-time mask detection running on-device. Hover the face to run the
          classifier — a MobileNetV2 model draws the box and confidence live. No
          frame ever leaves your session; nothing is recorded or stored.
        </div>

        {/* hero headline */}
        <div id="hero-info">
          <div className="badge">
            <span className="dot" /> Private · in-browser · real-time
          </div>
          <h1 className="headline">
            See the mask,
            <br />
            <span className="accent">not the face.</span>
          </h1>
          <p className="sub">
            MaskGuard classifies masked vs. unmasked faces the instant they appear —
            with animated, labeled bounding boxes and zero recording.
          </p>
          <a id="hero-enter" href={`${APP_URL}/`}>
            Enter MaskGuard
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M5 12h13M13 6l6 6-6 6"
                stroke="#fff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>

        {/* hero media — code-driven "detection scene" (no illustration).
            An abstract, on-brand visual: a glowing detection frame with
            animated corner brackets, a scanning sweep, a pulsing reticle and
            a live confidence chip. Sharp at any resolution, fully in the
            teal/purple palette. */}
        <div id="hero-media" aria-hidden="true">
          <div id="hero-scene">
            {/* soft depth glow */}
            <span className="hs-glow" />
            {/* concentric radar rings */}
            <span className="hs-ring r1" />
            <span className="hs-ring r2" />
            <span className="hs-ring r3" />

            {/* detection frame with animated corner brackets */}
            <div className="hs-frame">
              {/* face-landmark wireframe — the "subject" being detected */}
              <svg
                className="hs-face"
                viewBox="0 0 200 240"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                fill="none"
              >
                <defs>
                  <linearGradient id="hsFaceGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#0EA5A0" />
                    <stop offset="1" stopColor="#6D5EF0" />
                  </linearGradient>
                </defs>
                {/* face oval */}
                <path
                  d="M100 18 C142 18 168 54 168 108 C168 168 138 220 100 220 C62 220 32 168 32 108 C32 54 58 18 100 18 Z"
                  stroke="url(#hsFaceGrad)"
                  strokeOpacity="0.55"
                  strokeWidth="1.5"
                />
                {/* mesh triangulation lines */}
                <path
                  d="M100 18 L60 78 L100 120 L140 78 Z M60 78 L40 130 L100 120 M140 78 L160 130 L100 120 M40 130 L72 178 L100 150 L128 178 L160 130 M72 178 L100 220 L128 178 M100 120 L100 150"
                  stroke="url(#hsFaceGrad)"
                  strokeOpacity="0.4"
                  strokeWidth="1"
                />
                {/* landmark nodes */}
                <g className="hs-node">
                  <circle cx="100" cy="18" r="2.4" />
                  <circle cx="60" cy="78" r="2.4" />
                  <circle cx="140" cy="78" r="2.4" />
                  <circle cx="100" cy="120" r="2.8" />
                  <circle cx="40" cy="130" r="2.4" />
                  <circle cx="160" cy="130" r="2.4" />
                  <circle cx="72" cy="178" r="2.4" />
                  <circle cx="128" cy="178" r="2.4" />
                  <circle cx="100" cy="150" r="2.4" />
                  <circle cx="100" cy="220" r="2.4" />
                </g>
                {/* mask band across nose/mouth */}
                <path
                  d="M52 138 C70 168 130 168 148 138 L138 190 C120 206 80 206 62 190 Z"
                  fill="url(#hsFaceGrad)"
                  fillOpacity="0.16"
                  stroke="url(#hsFaceGrad)"
                  strokeOpacity="0.5"
                  strokeWidth="1.5"
                />
              </svg>

              <span className="hs-corner tl" />
              <span className="hs-corner tr" />
              <span className="hs-corner bl" />
              <span className="hs-corner br" />

              {/* scanning sweep line */}
              <span className="hs-scan" />

              {/* center reticle */}
              <svg
                className="hs-reticle"
                viewBox="0 0 120 120"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="hsGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#0EA5A0" />
                    <stop offset="1" stopColor="#6D5EF0" />
                  </linearGradient>
                </defs>
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="url(#hsGrad)"
                  strokeWidth="1.5"
                  strokeDasharray="10 8"
                />
                <circle cx="60" cy="60" r="3" fill="url(#hsGrad)" />
                <path
                  d="M60 8 V26 M60 94 V112 M8 60 H26 M94 60 H112"
                  stroke="url(#hsGrad)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>

              {/* live confidence chip */}
              <div className="hs-chip">
                <span className="hs-dot" />
                Mask · <span id="hs-conf">98%</span>
              </div>
            </div>

            {/* drifting data particles */}
            <span className="hs-particle p1" />
            <span className="hs-particle p2" />
            <span className="hs-particle p3" />
            <span className="hs-particle p4" />
            <span className="hs-particle p5" />
            <span className="hs-particle p6" />
            <span className="hs-particle p7" />
            <span className="hs-particle p8" />
          </div>
          <canvas id="reveal-canvas" />
        </div>

        {/* scroll hint */}
        <div id="scroll-hint" aria-hidden="true">
          <span>Scroll</span>
          <span className="line" />
        </div>

        {/* black gallery panel */}
        <section id="black-panel">
          <div id="panel-head">
            <div className="eyebrow">
              Live inference · <span id="live-metric">98%</span>
            </div>
            <h2>Detection, frame by frame</h2>
            <p>
              Every face is cropped, resized to 224×224, and run through the
              classifier in milliseconds. Green means masked, coral means not —
              labeled with the model&apos;s confidence.
            </p>
          </div>
          <div id="panel-wrapper" />
        </section>

        {/* outro */}
        <div id="outro-overlay" aria-hidden="true">
          {/* soft ambient glows + faint detection motif so the CTA panel
              isn't an empty white void */}
          <span className="od-glow g1" />
          <span className="od-glow g2" />
          <span className="od-ring r1" />
          <span className="od-ring r2" />
          <span className="od-bracket" aria-hidden="true">
            <svg viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg" fill="none">
              <defs>
                <linearGradient id="odGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#0EA5A0" />
                  <stop offset="1" stopColor="#6D5EF0" />
                </linearGradient>
              </defs>
              <path d="M20 70 V28 C20 24 24 20 28 20 H70" stroke="url(#odGrad)" strokeWidth="3" strokeLinecap="round" />
              <path d="M240 70 V28 C240 24 236 20 232 20 H190" stroke="url(#odGrad)" strokeWidth="3" strokeLinecap="round" />
              <path d="M20 190 V232 C20 236 24 240 28 240 H70" stroke="url(#odGrad)" strokeWidth="3" strokeLinecap="round" />
              <path d="M240 190 V232 C240 236 236 240 232 240 H190" stroke="url(#odGrad)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>
          <span className="od-particle op1" />
          <span className="od-particle op2" />
          <span className="od-particle op3" />
          <span className="od-particle op4" />
          <span className="od-particle op5" />
        </div>
        <div id="outro-info">
          <div className="eyebrow">Ready when you are</div>
          <h2>
            Point your camera.
            <br />
            <span className="g">We handle the rest.</span>
          </h2>
          <p>
            Consent-gated, encrypted in transit, discarded after every inference.
            Your camera, your control.
          </p>
        </div>
        <div id="outro-buy">
          <a href={`${APP_URL}/`}>
            Enter MaskGuard
            <svg viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M6 15h18M17 8l7 7-7 7"
                stroke="#fff"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
        <div id="outro-footer">
          <span>MaskGuard © 2026</span>
          <span>Privacy first</span>
        </div>
      </div>

      {/* Gallery image list (empty → gradient placeholders) + landing behaviour */}
      <Script id="maskguard-images" strategy="beforeInteractive">
        {`window.MASKGUARD_IMAGES = ${JSON.stringify(GALLERY_IMAGES)};`}
      </Script>
      <Script src="/static/landing.js" strategy="afterInteractive" />
    </>
  );
}
