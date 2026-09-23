'use client';

import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { Camera, Shield, Cpu, Sparkles } from 'lucide-react';

/**
 * Rebuilt data-flow diagram in the new visual language.
 *
 * Kept the same four nodes (webcam → gateway → inference → overlay) and the
 * same one-line descriptions from the original SVG, but rendered as glass
 * cards on top of the gradient-mesh background rather than as flat white
 * rects inside a wrapper SVG. Each node has a gradient icon badge; each
 * connector arrow has a small gradient dot traveling along it on a loop, so
 * the diagram reads as "data actually moves through this pipeline" rather
 * than a static blueprint.
 *
 * Framer Motion `whileInView` staggers the four nodes in on scroll.
 */

const nodes = [
  {
    label: 'Your webcam',
    sub: 'Frame captured in-browser',
    Icon: Camera,
  },
  {
    label: 'Node gateway',
    sub: 'Validated · rate-limited',
    Icon: Shield,
  },
  {
    label: 'Python inference',
    sub: 'MobileNetV2 classifier',
    Icon: Cpu,
  },
  {
    label: 'Live overlay',
    sub: 'Box + label, animated back',
    Icon: Sparkles,
  },
];

export default function HowItWorksDiagramV2() {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.08 } },
      }}
      className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]"
    >
      {nodes.map((n, i) => (
        <Fragment key={n.label}>
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 16, filter: 'blur(4px)' },
              visible: {
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
                transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
              },
            }}
            className="glass rounded-xl2 flex flex-col items-start gap-3 p-5"
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-sm"
              style={{ background: 'linear-gradient(135deg, #0EA5A0 0%, #6D5EF0 100%)' }}
            >
              <n.Icon size={18} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div>
              <div className="font-display text-lg text-ink">{n.label}</div>
              <div className="mt-1 text-xs text-inkmuted">{n.sub}</div>
            </div>
          </motion.div>

          {/* Connector — hidden on stacked mobile, shown between nodes on md+.
            The traveling dot uses SVG animateMotion along the arrow path. */}
          {i < nodes.length - 1 && (
            <motion.div
              key={`arrow-${i}`}
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { duration: 0.4, delay: 0.15, ease: 'easeOut' },
                },
              }}
              aria-hidden="true"
              className="hidden items-center justify-center md:flex"
            >
              <svg width="48" height="24" viewBox="0 0 48 24" fill="none">
                <defs>
                  <linearGradient id={`arrowGrad-${i}`} x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#0EA5A0" />
                    <stop offset="100%" stopColor="#6D5EF0" />
                  </linearGradient>
                </defs>
                <path
                  id={`arrowPath-${i}`}
                  d="M2 12 H42"
                  stroke={`url(#arrowGrad-${i})`}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path d="M40 6 L46 12 L40 18" stroke={`url(#arrowGrad-${i})`} strokeWidth="2" strokeLinecap="round" fill="none" />
                <circle r="3" fill="#6D5EF0">
                  <animateMotion dur="1.8s" repeatCount="indefinite" begin={`${i * 0.35}s`}>
                    <mpath href={`#arrowPath-${i}`} />
                  </animateMotion>
                </circle>
              </svg>
            </motion.div>
          )}
        </Fragment>
      ))}
    </motion.div>
  );
}
