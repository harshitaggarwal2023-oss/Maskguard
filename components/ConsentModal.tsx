'use client';

import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from './GlassCard';

export default function ConsentModal({
  open,
  onAllow,
  onCancel,
}: {
  open: boolean;
  onAllow: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/20 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <GlassCard strong className="max-w-md text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-deep">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 7h4l2-2h4l2 2h4v11H4V7Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </div>
              <h2 id="consent-title" className="font-display text-xl font-medium text-ink">
                Turn on your camera?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-inkmuted">
                MaskGuard needs webcam access to detect masks live. Frames are analyzed in
                memory and immediately discarded — nothing is recorded, saved, or sent anywhere
                beyond the single detection request.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  onClick={onAllow}
                  className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-surface transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Allow camera access
                </button>
                <button
                  onClick={onCancel}
                  className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-inkmuted transition-colors hover:bg-base"
                >
                  Not now
                </button>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
