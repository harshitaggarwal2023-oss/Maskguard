'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Zap, Target, ShieldOff } from 'lucide-react';
import GradientMesh from './GradientMesh';
import HowItWorksDiagramV2 from './HowItWorksDiagramV2';

/**
 * Landing sections 2–4 (below the hero).
 * All three use the same scroll-reveal recipe: fade + rise + slight blur-in,
 * stagger-children for grouped items. Panels stay translucent/neutral so the
 * gradient mesh behind them is what reads as colorful.
 */

const revealParent = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const revealChild = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

/* -------- Section 2: How it works -------- */
export function HowItWorksSection() {
  return (
    <section className="relative overflow-hidden py-28 sm:py-36">
      <GradientMesh intensity="soft" />
      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={revealParent}
          className="mb-12 text-center"
        >
          <motion.span
            variants={revealChild}
            className="text-xs font-semibold uppercase tracking-[0.18em] text-accent"
          >
            How it works
          </motion.span>
          <motion.h2
            variants={revealChild}
            className="mt-3 font-display text-4xl text-ink sm:text-5xl"
            style={{ letterSpacing: '-0.02em' }}
          >
            Four stops, <span className="gradient-text">milliseconds apart</span>
          </motion.h2>
          <motion.p
            variants={revealChild}
            className="mx-auto mt-4 max-w-xl text-inkmuted"
          >
            Each frame passes through the same short pipeline — captured in your browser,
            validated at the gateway, classified by the model, drawn back onto the video.
          </motion.p>
        </motion.div>

        <div className="glass-strong rounded-xl2 p-6 sm:p-10">
          <HowItWorksDiagramV2 />
        </div>
      </div>
    </section>
  );
}

/* -------- Section 3: Live preview + stats strip -------- */
export function LivePreviewSection() {
  const stats = [
    { Icon: Zap, label: 'Inference speed', value: '~40 ms', sub: 'per frame, model-only' },
    { Icon: Target, label: 'Validation accuracy', value: '98.6%', sub: 'from training_history.pickle' },
    { Icon: ShieldOff, label: 'Frames stored', value: '0', sub: 'ever, anywhere' },
  ];

  return (
    <section className="relative overflow-hidden py-28 sm:py-36">
      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={revealParent}
          className="grid gap-10 md:grid-cols-2 md:items-center"
        >
          {/* Left: preview panel — the "detecting" illustration with an animated scan sweep */}
          <motion.div variants={revealChild}>
            <div className="glass-strong rounded-xl2 relative aspect-square overflow-hidden">
              {/* Reuse the reveal illustration as a canned "actively detecting" preview. */}
              <div
                className="absolute inset-0 bg-center bg-no-repeat"
                style={{
                  backgroundImage: 'url(/hero-reveal.png)',
                  backgroundSize: 'contain',
                }}
                aria-hidden="true"
              />
              {/* Animated scanning sweep — a thin gradient bar drifting top→bottom */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 h-1 opacity-80"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, #0EA5A0 25%, #6D5EF0 75%, transparent 100%)',
                  boxShadow: '0 0 24px rgba(109,94,240,0.6)',
                  animation: 'scanSweep 3.2s ease-in-out infinite',
                }}
              />
              {/* Gradient-bordered detected chip */}
              <div
                className="glass-strong absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-ink"
                style={{
                  border: '1px solid transparent',
                  backgroundImage:
                    'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #0EA5A0 0%, #6D5EF0 100%)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, #0EA5A0 0%, #6D5EF0 100%)',
                  }}
                />
                Mask Detected · 97%
              </div>
            </div>
            {/* Local keyframes for the sweep — scoped inline to keep the section
              self-contained. */}
            <style jsx>{`
              @keyframes scanSweep {
                0% {
                  top: 8%;
                  opacity: 0;
                }
                10% {
                  opacity: 0.9;
                }
                90% {
                  opacity: 0.9;
                }
                100% {
                  top: 92%;
                  opacity: 0;
                }
              }
            `}</style>
          </motion.div>

          {/* Right: eyebrow + heading + stats strip */}
          <div>
            <motion.span
              variants={revealChild}
              className="text-xs font-semibold uppercase tracking-[0.18em] text-accent2"
            >
              Live preview
            </motion.span>
            <motion.h2
              variants={revealChild}
              className="mt-3 font-display text-4xl text-ink sm:text-5xl"
              style={{ letterSpacing: '-0.02em' }}
            >
              Detection happens <span className="gradient-text">in the frame</span>
            </motion.h2>
            <motion.p variants={revealChild} className="mt-4 text-inkmuted">
              A MobileNetV2 head trained on the Kaggle Face Mask Dataset runs against every
              frame you send it. Same-second results, no round-trip to a datacenter you can&apos;t
              see.
            </motion.p>

            <motion.div variants={revealChild} className="mt-8 grid grid-cols-3 gap-3">
              {stats.map(({ Icon, label, value, sub }) => (
                <div key={label} className="glass rounded-xl2 p-4">
                  <Icon size={16} className="text-accent" aria-hidden="true" />
                  <div className="mt-2 font-display text-2xl text-ink">{value}</div>
                  <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-inkmuted">
                    {label}
                  </div>
                  <div className="mt-1 text-[11px] leading-snug text-inkmuted">{sub}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* -------- Section 4: CTA band -------- */
export function CtaSection() {
  return (
    <section className="relative overflow-hidden py-28 sm:py-40">
      <GradientMesh />
      <div className="relative mx-auto max-w-4xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="glass-strong rounded-xl2 p-10 text-center sm:p-16"
        >
          <h2
            className="font-display text-4xl text-ink sm:text-6xl"
            style={{ letterSpacing: '-0.03em', lineHeight: 1 }}
          >
            See it work on <span className="gradient-text">your own camera</span>
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-inkmuted">
            One click, one permission prompt. Nothing is ever recorded or stored — every frame
            lives in memory only for the length of a single inference call.
          </p>
          <div className="mt-10">
            <Link
              href="/detect"
              className="inline-block rounded-full bg-brand-gradient px-9 py-4 text-base font-medium text-white transition-all hover:scale-[1.03] hover:shadow-glow hover:brightness-110 active:scale-95"
            >
              Try Live Detection
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
