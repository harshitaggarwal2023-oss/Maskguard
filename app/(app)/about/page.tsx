'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Brain, Shield, EyeOff, Lock } from 'lucide-react';
import GradientMesh from '@/components/GradientMesh';
import HowItWorksDiagramV2 from '@/components/HowItWorksDiagramV2';

/**
 * About page — same visual language as the new landing page.
 * Gradient-mesh backgrounds, upgraded glass, Framer Motion scroll reveals.
 * Content is preserved verbatim from the previous about page (including the
 * Kaggle dataset attribution link) — this is a visual rebuild, not a
 * content rewrite.
 */

const cardParent = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const cardChild = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const cards = [
  {
    Icon: Brain,
    title: 'Model',
    body: (
      <>
        A MobileNetV2 backbone (frozen, pretrained on ImageNet) with a small custom dense head,
        fine-tuned on the{' '}
        <a
          href="https://www.kaggle.com/datasets/andrewmvd/face-mask-detection"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-deep underline underline-offset-2 hover:text-accent"
        >
          Kaggle Face Mask Dataset
        </a>{' '}
        to distinguish <em>with_mask</em> from <em>without_mask</em>. It runs inside the internal
        Python (FastAPI) inference service — never publicly reachable.
      </>
    ),
  },
  {
    Icon: Shield,
    title: 'Gateway',
    body: (
      <>
        A Node.js gateway is the only public entrypoint. It terminates the browser&apos;s
        WebSocket stream, validates and rate-limits every frame, and forwards it internally to
        the inference service — enforcing security policy in one place.
      </>
    ),
  },
  {
    Icon: EyeOff,
    title: 'Privacy stance',
    body: (
      <>
        Video frames exist only in memory for the duration of a single inference call. Nothing is
        written to disk, logged with image content, or persisted server-side. Camera access is
        only ever requested after explicit, clearly-labeled consent.
      </>
    ),
  },
  {
    Icon: Lock,
    title: 'Security',
    body: (
      <>
        Helmet security headers, strict CORS allow-listing, per-connection and per-IP rate
        limits, frame size and type validation, and an internal shared-secret between the
        gateway and inference service round out the defense-in-depth model.
      </>
    ),
  },
];

export default function AboutPage() {
  return (
    <>
      {/* --- Page header --- */}
      <section className="relative overflow-hidden px-6 pb-16 pt-32 sm:pt-40">
        <GradientMesh intensity="soft" />
        <div className="relative mx-auto max-w-4xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-xs font-semibold uppercase tracking-[0.18em] text-accent"
          >
            About MaskGuard
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="mt-4 font-display text-5xl italic text-ink sm:text-6xl md:text-7xl"
            style={{ letterSpacing: '-0.04em', lineHeight: 1 }}
          >
            Architecture &amp; privacy,
            <br />
            in <span className="gradient-text">plain sight</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.3 }}
            className="mx-auto mt-6 max-w-xl text-inkmuted"
          >
            Three services, each with one job — the browser never talks to the model directly, and
            no video ever touches disk.
          </motion.p>
        </div>
      </section>

      {/* --- Data flow diagram --- */}
      <section className="relative px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="glass-strong rounded-xl2 relative overflow-hidden p-6 sm:p-10">
            {/* Faint mesh peek through the panel so the gradient language carries in */}
            <GradientMesh intensity="soft" className="opacity-40" />
            <div className="relative">
              <div className="mb-8 text-center">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent2">
                  Data flow
                </span>
                <h2
                  className="mt-2 font-display text-3xl text-ink sm:text-4xl"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  From your webcam, through two services, back
                </h2>
              </div>
              <HowItWorksDiagramV2 />
            </div>
          </div>
        </div>
      </section>

      {/* --- Four-card grid --- */}
      <section className="relative px-6 pb-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={cardParent}
          className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2"
        >
          {cards.map(({ Icon, title, body }) => (
            <motion.div
              key={title}
              variants={cardChild}
              className="glass rounded-xl2 group relative p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow"
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-sm"
                style={{ background: 'linear-gradient(135deg, #0EA5A0 0%, #6D5EF0 100%)' }}
              >
                <Icon size={20} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-display text-xl text-ink">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-inkmuted">{body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* --- Closing strip --- */}
      <section className="relative overflow-hidden px-6 pb-28">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="glass-strong rounded-xl2 relative overflow-hidden p-6 text-center sm:p-8"
          >
            <GradientMesh intensity="soft" className="opacity-50" />
            <p className="relative text-sm text-inkmuted">
              <span className="font-semibold text-ink">Zero frames stored, ever.</span>{' '}
              Curious what the pipeline looks like on your own camera?{' '}
              <Link href="/detect" className="text-accent underline underline-offset-2 hover:text-accent-deep">
                Try live detection →
              </Link>
            </p>
          </motion.div>
        </div>
      </section>
    </>
  );
}
