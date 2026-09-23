'use client';

import { useEffect, useState } from 'react';
import TrainingCharts from '@/components/TrainingCharts';
import GlassCard from '@/components/GlassCard';
import { TrainingHistory } from '@/lib/types';

const GATEWAY_HTTP_URL = process.env.NEXT_PUBLIC_GATEWAY_HTTP_URL || 'http://localhost:4000';

export default function InsightsPage() {
  const [history, setHistory] = useState<TrainingHistory | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const primaryRes = await fetch(`${GATEWAY_HTTP_URL}/api/training-history`);
        if (primaryRes.ok) {
          const data = await primaryRes.json();
          setHistory(data);
          return;
        }
      } catch {
        // Fallback to internal route handler if external gateway is unavailable
      }

      try {
        const fallbackRes = await fetch('/api/training-history');
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          setHistory(data);
          return;
        }
      } catch {
        setError(true);
      }
      setError(true);
    };

    fetchHistory();
  }, []);

  return (
    <section className="mx-auto max-w-5xl px-6 py-14">
      <div className="mb-8 text-center">
        <span className="text-xs font-medium uppercase tracking-wide text-accent-deep">
          Model insights
        </span>
        <h1 className="mt-2 font-display text-4xl text-ink">How the model learned</h1>
        <p className="mx-auto mt-3 max-w-lg text-inkmuted">
          MobileNetV2's convolutional base was frozen and a small dense head was fine-tuned on
          the Kaggle Face Mask Dataset. These curves come directly from that training run.
        </p>
      </div>

      {error && (
        <GlassCard className="mx-auto max-w-md text-center text-sm text-inkmuted">
          Couldn't load training history from the gateway. Make sure backend-node and
          backend-python are running.
        </GlassCard>
      )}

      {!history && !error && (
        <div className="grid gap-6 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-80 animate-shimmer rounded-xl2 shimmer-bg" />
          ))}
        </div>
      )}

      {history && <TrainingCharts history={history} />}
    </section>
  );
}
