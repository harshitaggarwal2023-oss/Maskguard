'use client';

import { io, Socket } from 'socket.io-client';

const DEFAULT_GATEWAY_WS_URL =
  process.env.NEXT_PUBLIC_GATEWAY_WS_URL || 'https://maskguard-backend.onrender.com';

let socket: Socket | null = null;
let currentUrl: string = DEFAULT_GATEWAY_WS_URL;

/**
 * Gets the current active gateway URL, checking localStorage first.
 */
export function getGatewayUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('maskguard_gateway_url');
    if (custom && (custom.includes('localhost') || custom.includes('127.0.0.1'))) {
      localStorage.removeItem('maskguard_gateway_url');
      return DEFAULT_GATEWAY_WS_URL;
    }
    if (custom) {
      return custom;
    }
  }
  return DEFAULT_GATEWAY_WS_URL;
}

/**
 * Updates the gateway URL and disconnects any existing socket connection.
 */
export function setGatewayUrl(url: string) {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('maskguard_gateway_url', url.trim());
    } else {
      localStorage.removeItem('maskguard_gateway_url');
    }
  }
  disconnectSocket();
  socket = null;
}

/**
 * Lazily creates a single shared WebSocket connection to the Node gateway.
 * Frames are sent as raw ArrayBuffers (JPEG bytes) — never as base64/JSON —
 * to keep payloads small at ~8-12fps.
 */
export function getSocket(overrideUrl?: string): Socket {
  const targetUrl = overrideUrl || getGatewayUrl();
  if (!socket || currentUrl !== targetUrl) {
    if (socket) {
      socket.disconnect();
    }
    currentUrl = targetUrl;
    socket = io(targetUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnectionAttempts: 5,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
  }
}
