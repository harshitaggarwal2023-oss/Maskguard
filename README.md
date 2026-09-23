# MaskGuard — one merged site (landing + app)

🌐 **Live URL**: [https://maskguard.vercel.app](https://maskguard.vercel.app)

Real-time face-mask detection, private by design. The **cinematic landing
page** and the **real app** are now a **single Next.js site on one port** —
no more separate `:3000` landing and `:3001` app.

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

## Live Hosting

### 1. Frontend (Vercel)
The merged Next.js frontend is deployed live on Vercel:
👉 **[https://maskguard.vercel.app](https://maskguard.vercel.app)**

To redeploy or deploy updates:
```bash
npx vercel --prod
```

### 2. Backend Inference & Gateway (Render)
To host the live Python TensorFlow inference and Node.js Socket.IO gateway on Render's free tier:
- A unified single-container `Dockerfile.backend` and `render.yaml` Blueprint are provided in the repo.
- Push the repository to GitHub and create a new **Web Service** or **Blueprint** on [Render](https://render.com).
- Set Environment Variables:
  - `PORT=10000`
  - `ALLOWED_ORIGINS=https://maskguard.vercel.app,http://localhost:3000,*`
- Once deployed, paste your Render URL (e.g. `https://maskguard-backend.onrender.com`) into the **Gateway** setting on `https://maskguard.vercel.app/detect`, or set `NEXT_PUBLIC_GATEWAY_WS_URL` in Vercel project settings!

- **Status**: ✅ Deployed Live on Vercel
- **Frontend URL**: [https://maskguard.vercel.app](https://maskguard.vercel.app)
- **Tech**: Next.js 14 + React 18 + Tailwind + Socket.IO · Node gateway · FastAPI/TensorFlow inference
