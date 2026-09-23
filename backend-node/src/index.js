/**
 * MaskGuard API Gateway (Node.js / Express + Socket.IO)
 *
 * This is the ONLY publicly reachable backend service. It:
 *   - Serves REST endpoints (health, training-history proxy)
 *   - Terminates the browser's WebSocket connection for the live video
 *     frame stream (much lower overhead than HTTP polling for ~10fps)
 *   - Validates + rate-limits every incoming frame before forwarding it,
 *     over the internal network only, to the Python inference service
 *   - Relays inference results back to the browser over the same socket
 *
 * The Python service is never exposed to the internet; only this process
 * talks to it, using an internal shared-secret header.
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 4000;
const INFERENCE_URL = process.env.INFERENCE_SERVICE_URL || 'http://localhost:8000';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const ALLOWED_ORIGINS_RAW = process.env.ALLOWED_ORIGINS || 'http://localhost:3000,https://maskguard.vercel.app';
const ALLOWED_ORIGINS = ALLOWED_ORIGINS_RAW.split(',').map((o) => o.trim());

const isOriginAllowed = (origin) => {
  if (!origin) return true; // non-browser or same-origin
  if (ALLOWED_ORIGINS.includes('*')) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith('.vercel.app')) return true;
  return false;
};

// --- Tunables -------------------------------------------------------------
const MAX_FRAME_BYTES = 400 * 1024; // 400KB per JPEG frame (~8-12fps @ q0.7 720p should stay well under this)
const MAX_FRAMES_PER_SECOND_PER_SOCKET = 15; // hard ceiling, well above the 8-12fps the client targets
const MAX_CONCURRENT_SOCKETS_PER_IP = 3;

const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(compression());
app.use(morgan('tiny'));
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) callback(null, true);
      else callback(new Error('Not allowed by CORS'));
    },
    credentials: false,
  })
);
app.use(express.json({ limit: '50kb' }));

const restLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', restLimiter);

app.get('/api/health', async (_req, res) => {
  try {
    const r = await fetch(`${INFERENCE_URL}/health`, { timeout: 3000 });
    const data = await r.json();
    res.json({ gateway: 'ok', inference: data });
  } catch (err) {
    res.status(503).json({ gateway: 'ok', inference: 'unreachable' });
  }
});

// Proxies the training-history chart data — never touches the browser
// directly, kept behind the gateway like everything else.
app.get('/api/training-history', async (_req, res) => {
  try {
    const r = await fetch(`${INFERENCE_URL}/training-history`, {
      headers: { 'x-internal-token': INTERNAL_TOKEN },
    });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'failed to load training history' });
  }
});

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
    credentials: false,
  },
  maxHttpBufferSize: MAX_FRAME_BYTES + 1024, // reject oversized payloads at the transport level
});

// naive in-memory per-IP concurrent connection cap
const socketsByIp = new Map();

io.use((socket, next) => {
  const ip = socket.handshake.address;
  const count = socketsByIp.get(ip) || 0;
  if (count >= MAX_CONCURRENT_SOCKETS_PER_IP) {
    return next(new Error('too many concurrent sessions from this address'));
  }
  socketsByIp.set(ip, count + 1);
  next();
});

io.on('connection', (socket) => {
  const ip = socket.handshake.address;
  let frameCount = 0;
  let windowStart = Date.now();

  socket.emit('ready', { message: 'connected to MaskGuard gateway' });

  socket.on('frame', async (payload) => {
    try {
      // --- rate limiting per-socket -----------------------------------
      const now = Date.now();
      if (now - windowStart > 1000) {
        windowStart = now;
        frameCount = 0;
      }
      frameCount += 1;
      if (frameCount > MAX_FRAMES_PER_SECOND_PER_SOCKET) {
        socket.emit('error_message', { error: 'rate limit exceeded, slow down' });
        return;
      }

      // --- input validation --------------------------------------------
      if (!payload || !(payload instanceof ArrayBuffer || Buffer.isBuffer(payload))) {
        socket.emit('error_message', { error: 'invalid frame payload' });
        return;
      }
      const buf = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
      if (buf.length === 0 || buf.length > MAX_FRAME_BYTES) {
        socket.emit('error_message', { error: 'frame size out of bounds' });
        return;
      }
      // cheap JPEG magic-byte check (0xFFD8) before forwarding downstream
      if (buf[0] !== 0xff || buf[1] !== 0xd8) {
        socket.emit('error_message', { error: 'payload is not a valid JPEG frame' });
        return;
      }

      // --- forward to internal inference service ------------------------
      const upstream = await fetch(`${INFERENCE_URL}/infer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'x-internal-token': INTERNAL_TOKEN,
        },
        body: buf,
      });

      if (!upstream.ok) {
        socket.emit('error_message', { error: 'inference service error' });
        return;
      }

      const result = await upstream.json();
      socket.emit('detection_result', result);
      // Frame buffer (buf) goes out of scope here and is garbage collected —
      // nothing about this request is written to disk or persisted anywhere.
    } catch (err) {
      socket.emit('error_message', { error: 'internal error processing frame' });
    }
  });

  socket.on('disconnect', () => {
    const count = socketsByIp.get(ip) || 1;
    if (count <= 1) socketsByIp.delete(ip);
    else socketsByIp.set(ip, count - 1);
  });
});

server.listen(PORT, () => {
  console.log(`[maskguard-gateway] listening on :${PORT}`);
  console.log(`[maskguard-gateway] forwarding inference to ${INFERENCE_URL}`);
});
