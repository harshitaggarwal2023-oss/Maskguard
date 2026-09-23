'use client';

import { useState, useEffect } from 'react';
import GlassCard from './GlassCard';
import { SessionStats } from '@/lib/types';
import { getGatewayUrl, setGatewayUrl } from '@/lib/socket';

export default function StatsPanel({
  stats,
  connectionStatus,
  inferenceMs,
}: {
  stats: SessionStats;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
  inferenceMs: number | null;
}) {
  const totalFaces = stats.maskedFrameFaces + stats.unmaskedFrameFaces;
  const maskedPct = totalFaces > 0 ? Math.round((stats.maskedFrameFaces / totalFaces) * 100) : 0;

  const [gatewayUrl, setUrl] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [inputUrl, setInputUrl] = useState('');

  useEffect(() => {
    const current = getGatewayUrl();
    setUrl(current);
    setInputUrl(current);
  }, []);

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setGatewayUrl(inputUrl);
    setUrl(inputUrl);
    setShowConfig(false);
    window.location.reload();
  };

  const statusCopy: Record<typeof connectionStatus, string> = {
    idle: 'Not connected',
    connecting: 'Connecting…',
    connected: 'Live',
    error: 'Connection error',
  };

  const statusColor: Record<typeof connectionStatus, string> = {
    idle: 'bg-inkmuted',
    connecting: 'bg-accent animate-pulseSoft',
    connected: 'bg-accent',
    error: 'bg-alert',
  };

  return (
    <GlassCard className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${statusColor[connectionStatus]}`}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-ink" aria-live="polite">
            {statusCopy[connectionStatus]}
          </span>
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="text-xs text-accent underline underline-offset-2 hover:text-accent-deep transition-colors"
          type="button"
        >
          {showConfig ? 'Close' : 'Gateway'}
        </button>
      </div>

      {showConfig && (
        <form onSubmit={handleSaveUrl} className="rounded-lg bg-surface/50 p-3 text-xs border border-line flex flex-col gap-2">
          <label htmlFor="gateway-input" className="font-medium text-ink">
            Gateway WebSocket URL:
          </label>
          <input
            id="gateway-input"
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="http://localhost:4000 or https://..."
            className="w-full rounded px-2.5 py-1.5 bg-surface text-ink border border-line focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <div className="flex items-center justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={() => {
                setGatewayUrl('');
                setInputUrl(process.env.NEXT_PUBLIC_GATEWAY_WS_URL || 'http://localhost:4000');
                setUrl(process.env.NEXT_PUBLIC_GATEWAY_WS_URL || 'http://localhost:4000');
                window.location.reload();
              }}
              className="text-inkmuted hover:text-ink px-2 py-1 rounded"
            >
              Reset
            </button>
            <button
              type="submit"
              className="bg-accent text-surface px-3 py-1 rounded font-medium shadow-sm hover:opacity-95"
            >
              Save & Reload
            </button>
          </div>
        </form>
      )}

      {connectionStatus === 'error' && !showConfig && (
        <div className="rounded-lg bg-alert/10 border border-alert/20 p-2.5 text-xs text-alert-deep">
          <p className="font-medium">Gateway unreachable</p>
          <p className="mt-0.5 opacity-90 text-[11px]">
            Targeting <span className="font-mono">{gatewayUrl}</span>. Click &ldquo;Gateway&rdquo; above to point to a live Render backend URL or local gateway.
          </p>
        </div>
      )}

      <div>
        <div className="flex justify-between text-xs text-inkmuted">
          <span>Masked</span>
          <span>{maskedPct}%</span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${maskedPct}%` }}
          />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs text-inkmuted">Frames processed</dt>
          <dd className="font-display text-lg text-ink">{stats.framesProcessed}</dd>
        </div>
        <div>
          <dt className="text-xs text-inkmuted">Faces detected</dt>
          <dd className="font-display text-lg text-ink">{totalFaces}</dd>
        </div>
        <div>
          <dt className="text-xs text-inkmuted">With mask</dt>
          <dd className="font-display text-lg text-accent-deep">{stats.maskedFrameFaces}</dd>
        </div>
        <div>
          <dt className="text-xs text-inkmuted">Without mask</dt>
          <dd className="font-display text-lg text-alert-deep">{stats.unmaskedFrameFaces}</dd>
        </div>
      </dl>

      {inferenceMs !== null && (
        <p className="font-mono text-xs text-inkmuted">Inference: {inferenceMs.toFixed(1)} ms</p>
      )}

      <p className="text-xs leading-relaxed text-inkmuted">
        Your video stream is processed frame-by-frame in memory. No frame is ever written to
        disk or stored beyond the moment it&apos;s classified.
      </p>
    </GlassCard>
  );
}
