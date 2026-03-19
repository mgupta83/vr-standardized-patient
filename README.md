# vr-standardized-patient

A **VR-based Standardized Patient** simulation platform for medical training. Built with WebXR + BabylonJS for immersive VR, Hono for a fast API backend, MongoDB for persistence, and JWT for authentication — all in a TypeScript monorepo powered by pnpm.

---

## 🏗 Tech Stack

| Layer | Technology |
|---|---|
| **VR / 3D** | [BabylonJS](https://www.babylonjs.com/) + [WebXR](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API) |
| **React 3D binding** | [Reactylon](https://reactylon.com/) |
| **Frontend** | React 18, React Router, Zustand, Vite |
| **Backend** | [Hono](https://hono.dev/) + [@hono/node-server](https://github.com/honojs/node-server) |
| **Protocol** | HTTP/1.1 + HTTP/2 (QUIC / HTTP/3 optional, see below) |
| **Database** | MongoDB + Mongoose ODM |
| **Auth** | JWT (jsonwebtoken + bcryptjs) |
| **Language** | TypeScript 5 (strict) |
| **Monorepo** | pnpm workspaces |
| **Linting** | ESLint + Prettier |
| **Config** | `.env` per package |

---

## 📁 Project Structure

```
vr-standardized-patient/
├── packages/
│   ├── shared/          # Shared TypeScript types (User, Scenario, Session, …)
│   ├── server/          # Hono API server (auth, scenarios, sessions)
│   └── client/          # React + BabylonJS WebXR frontend
├── .eslintrc.cjs
├── .prettierrc
├── tsconfig.base.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js ≥ 20** — [nodejs.org](https://nodejs.org)
- **pnpm ≥ 9** — `npm install -g pnpm`
- **MongoDB** — local instance or [MongoDB Atlas](https://www.mongodb.com/atlas)
```bash
## Setup Local Instance of MongoDB


# 1. Ensure Homebrew and Xcode Command Line Tools are installed.
# If you don't have Xcode command-line tools, run: 
xcode-select --install.
# If you don't have Homebrew, follow the instructions on the official Homebrew website to install it.

# 2. Tap the official MongoDB Homebrew repository:
brew tap mongodb/brew

# 3. Update Homebrew to ensure all formulas are current:
brew update

# 4. Install MongoDB Community Edition. You can specify a version (e.g., @7.0 for version 7.0), or install the latest supported version:
brew install mongodb-community@7.0

# 5. Start the MongoDB service:
brew services start mongodb-community@7.0

# 6. Verify the service is running:
brew services list
```

> **WebXR note**: The VR scene runs natively in VR headset browsers (Meta Quest, etc.) or in desktop browsers without a headset (desktop fallback 3D view). WebXR requires **HTTPS** or `localhost`.

---

### 1. Clone & Install

```bash
git clone https://github.com/mgupta83/vr-standardized-patient.git
cd vr-standardized-patient
pnpm install
```

---

### 2. Configure Environment Variables

Copy the example files and fill in your values:

```bash
# Server
cp packages/server/.env.example packages/server/.env

# Client
cp packages/client/.env.example packages/client/.env
```

**`packages/server/.env`** key variables:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP port for the API server |
| `MONGODB_URI` | `mongodb://localhost:27017/vr-standardized-patient` | MongoDB connection string |
| `JWT_SECRET` | *(required)* | Long random string for signing JWTs |
| `JWT_EXPIRES_IN` | `7d` | JWT expiry (e.g. `7d`, `24h`) |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |

**`packages/client/.env`** key variables:

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3001` | Base URL of the API server |
| `VITE_APP_TITLE` | `VR Standardized Patient` | App title |

---

### 3. Run in Development

```bash
# Start both server (port 3001) and client (port 5173) in parallel
pnpm dev
```

Or run each separately:

```bash
pnpm --filter @vr-sp/server dev    # API server with hot-reload
pnpm --filter @vr-sp/client dev    # Vite dev server
```

Open **http://localhost:5173** in your browser.

---

### 4. Build for Production

```bash
pnpm build
```

Then start the server:

```bash
pnpm --filter @vr-sp/server start
```

And serve the client `dist/` folder with any static host (Nginx, Vercel, Cloudflare Pages, etc.).

---

## 🔌 API Reference

Base URL: `http://localhost:3001`

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | ❌ | Register a new user |
| `POST` | `/api/auth/login` | ❌ | Login and receive JWT |

**Register body:**
```json
{
  "email": "alice@example.com",
  "password": "secret123",
  "name": "Alice",
  "role": "student"
}
```

**Login body:**
```json
{ "email": "alice@example.com", "password": "secret123" }
```

**Response:**
```json
{
  "token": "<jwt>",
  "user": { "id": "…", "email": "…", "name": "…", "role": "student", "createdAt": "…" }
}
```

---

### Scenarios (requires `Authorization: Bearer <token>`)

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/scenarios` | any | List scenarios (paginated) |
| `GET` | `/api/scenarios/:id` | any | Get one scenario |
| `POST` | `/api/scenarios` | instructor/admin | Create a scenario |
| `DELETE` | `/api/scenarios/:id` | admin | Delete a scenario |

---

### Sessions (requires `Authorization: Bearer <token>`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/sessions` | List my sessions |
| `POST` | `/api/sessions/start` | Start a new simulation session |
| `PATCH` | `/api/sessions/:id/complete` | Mark session complete with score |

---

## 🥽 VR Scene

- Built with **BabylonJS** — rendered on a full-screen `<canvas>`
- **WebXR** is initialised automatically via `WebXRDefaultExperience.CreateAsync()`
- If a VR headset is detected and the browser supports WebXR, an **"Enter VR"** button is overlaid on the canvas by BabylonJS
- Desktop fallback: full 3D ArcRotate camera with mouse/touch controls
- The scene models an **examination room** with a patient on a table, vital signs monitor, and ambient lighting

---

## ⚡ QUIC / HTTP/3

The starter uses `@hono/node-server` (HTTP/1.1). To enable **HTTP/3 (QUIC)**:

1. Generate TLS certificates (self-signed for dev, CA-signed for prod):
   ```bash
   mkdir -p packages/server/certs
   openssl req -x509 -newkey rsa:4096 -keyout packages/server/certs/key.pem \
     -out packages/server/certs/cert.pem -days 365 -nodes
   ```

2. Install the QUIC adapter:
   ```bash
   pnpm --filter @vr-sp/server add @hono/node-server
   # For QUIC/HTTP3, a Node.js QUIC library like 'node:http2' or
   # a Cloudflare Workers deployment handles this natively.
   ```

3. Alternatively, deploy to **Cloudflare Workers** (supports HTTP/3 out of the box with zero config) using the [Hono Cloudflare adapter](https://hono.dev/docs/getting-started/cloudflare-workers).

---

## 🛠 Developer Commands

| Command | Description |
|---|---|
| `pnpm dev` | Run all packages in parallel (dev mode) |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all TypeScript/TSX files |
| `pnpm format` | Format all files with Prettier |
| `pnpm format:check` | Check formatting without writing |
| `pnpm typecheck` | TypeScript type-check all packages |
| `pnpm clean` | Remove all `dist/` and `node_modules/` |

---

## 📐 Architecture Overview

```
Browser (WebXR / Desktop)
        │
        ▼
 ┌──────────────────────┐
 │   React + BabylonJS  │  ←── Reactylon (React bindings for BabylonJS)
 │   Vite + TypeScript  │
 └──────────┬───────────┘
            │ REST (JWT Bearer)
            ▼
 ┌──────────────────────┐
 │    Hono API Server   │  ←── Node.js, @hono/node-server
 │    Port 3001         │
 └──────────┬───────────┘
            │
            ▼
 ┌──────────────────────┐
 │      MongoDB         │  ←── Mongoose ODM
 └──────────────────────┘
```

---

## 🔐 Security Notes

- JWT secrets must be a long, random string in production (`openssl rand -base64 64`)
- Passwords are hashed with **bcryptjs** (12 salt rounds)
- Passwords are excluded from all JSON responses (`select: false` + toJSON transform)
- CORS is restricted to `CORS_ORIGIN` env variable
- Input validation is done with **Zod** on all API routes

---

## 📄 License

MIT
