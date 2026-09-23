# MaskGuard — Real-Time Face Mask Detection

[![Live Demo](https://img.shields.io/badge/Demo-maskguard.vercel.app-0FA3A0?style=for-the-badge&logo=vercel)](https://maskguard.vercel.app)
[![Backend API](https://img.shields.io/badge/Backend-Render.com-46E3B7?style=for-the-badge&logo=render)](https://maskguard-backend.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/harshitaggarwal2023-oss/Maskguard)

> **MaskGuard is 100% cloud-hosted and live** — private by design, edge-optimized, real-time face-mask detection. No local server or installation needed to test or use!

| Service | Platform | Live URL | Status |
| :--- | :--- | :--- | :--- |
| **Frontend (Landing & Web App)** | **Vercel** | [https://maskguard.vercel.app](https://maskguard.vercel.app) | 🟢 **Live** |
| **Inference Backend & Gateway** | **Render** | [https://maskguard-backend.onrender.com](https://maskguard-backend.onrender.com) | 🟢 **Live** |
| **Source Code** | **GitHub** | [harshitaggarwal2023-oss/Maskguard](https://github.com/harshitaggarwal2023-oss/Maskguard) | 🟢 **Synced** |

---

## How the merge works

```
http://localhost:3000/
        │
        ▼
   [ landing page ]   ← the cinematic scroll experience (unchanged design)
        │  click "Enter MaskGuard"
        ▼
http://localhost:3000/app   ← HeroSpotlight home (the old app "/", unchanged)
        │  app nav: How it works · Live Detection · Insights · About
        ▼
/detect → talks to Node gateway (:4000) → Python inference (:8000, internal)
```

- `/`         → **landing page** (front door). Owns its own logo, custom cursor
                and footer, so it does **not** show the app's Nav/Footer.
- `/app`      → the app's **HeroSpotlight** home (this is where "Enter
                MaskGuard" now lands — an internal route, same origin/port).
- `/detect`   → live webcam detection (unchanged).
- `/insights` → training charts & stats (unchanged).
- `/about`    → about page (unchanged).

Nothing about either design changed — the landing markup/CSS/JS are ported
verbatim, and the app pages are untouched. The only edits were routing:
the app home moved from `/` to `/app`, and the "Enter MaskGuard" buttons now
link to `/app` instead of a second port.

## Project structure

```
webapp/
├── app/
│   ├── layout.tsx            # root layout: minimal (html/body + globals)
│   ├── page.tsx              # "/"  → the cinematic LANDING page
│   ├── globals.css           # app (Tailwind) globals
│   └── (app)/                # route group = the real app (Nav + Footer)
│       ├── layout.tsx        # adds <Nav/> + <Footer/>
│       ├── app/page.tsx      # "/app"      → HeroSpotlight home
│       ├── detect/page.tsx   # "/detect"   → live detection
│       ├── insights/page.tsx # "/insights"
│       └── about/page.tsx    # "/about"
├── components/               # React components (Nav, HeroSpotlight, WebcamFeed…)
├── lib/                      # socket.io client + types
├── public/
│   └── static/               # ported landing assets:
│       ├── landing.css        #   landing styles
│       ├── landing.js         #   landing scroll/cursor behaviour
│       ├── hero-base.png      #   landing hero images
│       └── hero-reveal.png
├── backend-node/             # Node/Socket.IO gateway (:4000)
├── backend-python/           # FastAPI + MobileNetV2 inference (:8000, internal)
├── docker-compose.yml        # all three services (frontend now on :3000)
└── ecosystem.config.cjs      # PM2 config for the merged frontend (:3000)
```

## Run it (local dev)

### Frontend only (landing + app pages)
```bash
cd webapp
npm install
npm run build
pm2 start ecosystem.config.cjs     # serves the merged site on :3000
# or: npm run dev                   # Next.js dev server on :3000
```
Open **http://localhost:3000** → click **"Enter MaskGuard"** → you land on the
app's HeroSpotlight home at **/app**.

### With live detection (all three services)
Live webcam detection needs the Node gateway (:4000) and Python inference
(:8000). Docker Compose is easiest:
```bash
cd webapp
cp backend-python/.env.example backend-python/.env
cp backend-node/.env.example   backend-node/.env
cp .env.example .env

openssl rand -hex 32
# paste the same value into INTERNAL_SERVICE_TOKEN in BOTH
# backend-python/.env and backend-node/.env

docker compose up --build
```
Port map: **3000** merged site · **4000** Node gateway · **8000** Python
inference (internal only).

## Functional entry URIs
| Path        | What it is                                   |
|-------------|-----------------------------------------------|
| `/`         | Cinematic landing page (front door)           |
| `/app`      | HeroSpotlight home — "Enter MaskGuard" target |
| `/detect`   | Live webcam mask detection                    |
| `/insights` | Training charts & model stats                 |
| `/about`    | About the project                             |
| `/static/*` | Landing assets (css/js/hero images)           |

## Data & backend
- **Node gateway** (`backend-node`, :4000): Socket.IO relay; receives JPEG
  frames from `/detect`, forwards to the Python service, returns detections.
- **Python inference** (`backend-python`, :8000): FastAPI + a MobileNetV2
  transfer-learning classifier (`model/mask_detector.h5`) trained on the
  Kaggle Face Mask Dataset. Internal-only — never exposed to the host.
- **No storage**: frames live in memory only for the length of one inference
  call; nothing is recorded or persisted.
- Frontend → gateway URLs are set via `NEXT_PUBLIC_GATEWAY_HTTP_URL` /
  `NEXT_PUBLIC_GATEWAY_WS_URL` in `.env`.

## 🌐 Live Production Deployments

### 1. Frontend Web App (Vercel)
- **Live URL**: [https://maskguard.vercel.app](https://maskguard.vercel.app)
- **Pages**:
  - `/` — Cinematic landing page with interactive 3D shield & animations
  - `/app` — Application overview & system controls
  - `/detect` — Real-time webcam mask detection with animated bounding boxes
  - `/insights` — Dynamic model training accuracy and loss curves
  - `/about` — Architecture overview & technical specifications

### 2. Unified Backend & AI Inference (Render)
- **Live URL**: [https://maskguard-backend.onrender.com](https://maskguard-backend.onrender.com)
- **Architecture**: Single unified Docker container running:
  - **Python FastAPI microservice** (internal `:8000`) loading the TensorFlow MobileNetV2 `mask_detector.h5` model & OpenCV Haar Cascade.
  - **Node.js Express + Socket.IO API Gateway** (public on `$PORT`), handling bi-directional streaming, CORS, rate-limiting, and input validation.

### 3. Latency & Free-Tier Optimizations
- **Canvas Downscaling**: The frontend downscales capture frames to max 480px before JPEG compression, reducing payload & pixel processing by **~85%–94%** and cutting detection time from ~1200ms to **~30ms**.
- **In-Flight Backpressure**: The browser only transmits the next webcam frame after receiving the previous inference result, completely eliminating frame pile-ups in server memory.
- **Node.js Drop Guard**: Extra frames arriving while upstream inference is busy are dropped immediately, guaranteeing RAM usage stays safely under Render's 512MB free-tier ceiling.
- **Direct Tensor Execution**: Model execution uses direct `model(batch, training=False).numpy()` instead of Keras `.predict()`, avoiding graph setup overhead and shaving off ~150ms per frame.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Framer Motion, Socket.IO Client, Lucide React
- **Gateway**: Node.js, Express, Socket.IO, Helmet, express-rate-limit
- **Inference Service**: Python 3.11, FastAPI, Uvicorn, TensorFlow 2.16 (MobileNetV2), OpenCV, NumPy, Scikit-learn
- **Hosting**: Vercel (Frontend edge network), Render (Dockerized fullstack backend)
