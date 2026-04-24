# 05 — Setup & Operations Guide

## Prerequisites

- **Docker Desktop** ≥ 24 (tested on macOS Darwin 25 / aarch64, Docker 29)
- **Docker Compose** v2 (`docker compose`)
- 500 MB free disk space for images + DB
- Open ports **3001** (backend) and **4000** (frontend) on localhost

No Node.js, npm, or SQLite install is required on the host — everything runs inside containers.

## Quick start (Docker)

```bash
cd /path/to/vulhealth
docker compose up --build -d
```

First build takes ~90 s (npm install + sqlite native module compile).

Once up:

| URL                                 | What it is                               |
|-------------------------------------|------------------------------------------|
| http://localhost:4000               | React SPA (Landing page)                 |
| http://localhost:3001               | Banner JSON                              |
| http://localhost:3001/api-docs      | Swagger UI for the API                   |
| http://localhost:3001/health        | Liveness probe                           |

Tail logs:

```bash
docker compose logs -f                # everything
docker compose logs -f backend        # just the API
docker compose logs -f frontend       # just the Vite dev server
```

Stop & remove:

```bash
docker compose down
```

## Seed accounts

| Role         | Username     | Password     |
|--------------|--------------|--------------|
| Admin        | `admin`      | `admin123`   |
| Doctor       | `dr.smith`   | `smith2024`  |
| Doctor       | `dr.jones`   | `password`   |
| Doctor       | `dr.weak`    | `123456`     |
| Patient      | `alice`      | `password`   |
| Patient      | `bob`        | `123456`     |
| Receptionist | `reception`  | `reception`  |

All 10 doctors except `dr.smith` (who uses `smith2024`) and `dr.weak` (who uses `123456`) log in with `password`. All 20 patients use `password` or `123456`.

## Reset the database

```bash
rm backend/data/vulhealth.db
docker compose restart backend
```

The first request after restart triggers `db.init()` which re-runs `seed.sql`.

## Reset uploads

```bash
rm -rf backend/uploads/*
touch backend/uploads/.gitkeep
```

## Running without Docker (development)

If you already have Node 20 + npm and SQLite build tools (`python3`, `make`, a C++ compiler), you can run the backend and frontend natively.

```bash
# Terminal 1 — backend
cd backend
npm install
npm run dev      # or: npm start

# Terminal 2 — frontend
cd frontend
npm install
BACKEND_URL=http://localhost:3001 npm run dev
```

The Vite `server.proxy` setting forwards `/api/*` and `/uploads/*` to the value of `BACKEND_URL`.

## Environment variables

| Variable       | Used by          | Default                         | Purpose                                    |
|----------------|------------------|---------------------------------|--------------------------------------------|
| `PORT`         | backend          | `3001`                          | HTTP port for Express                      |
| `JWT_SECRET`   | backend          | `secret`                        | HS256 signing key (**deliberately weak**)  |
| `NODE_ENV`     | backend          | `development`                   | Used by the error handler (dev = verbose)  |
| `DB_PATH`      | backend          | `backend/data/vulhealth.db`     | SQLite file location                       |
| `BACKEND_URL`  | frontend (Vite)  | `http://backend:3001` (Docker) / `http://localhost:3001` (native) | Proxy target for `/api/*` |

## File layout after running

```
backend/
├── data/
│   ├── vulhealth.db       ← created on first boot
│   └── logs/
│       └── app.log
└── uploads/               ← user-uploaded files served at /uploads/*
```

These directories are **git-ignored** (see `.gitignore`). Safe to delete — app will recreate as needed.

---

## Running Shannon against VulHealth

Shannon is a web-pentest automation pipeline located at `../shannon/` (outside the `vulhealth/` directory).

1. Make sure VulHealth is running: `docker compose up -d` from `vulhealth/`.
2. Start Shannon from its directory:

```bash
cd ../shannon
./shannon start \
    URL=http://host.docker.internal:4000 \
    REPO=dummy \
    CONFIG=./configs/vulhealth.yaml
```

3. Watch the progress: Shannon logs session IDs; reports land in `shannon/audit-logs/<sessionId>/`.

The preconfigured `shannon/configs/vulhealth.yaml` already contains:

- Target URL (`http://host.docker.internal:4000`)
- Login URL & form flow (fills `alice` / `password`)
- Success condition (cookie set OR URL changes after submit)
- Secondary credentials for `dr.smith` and `admin` so Shannon can test privilege boundaries

See [`06-security-notes.md`](./06-security-notes.md) for expected findings.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `EADDRINUSE: port 3001` or `4000` | Another process is using the port. Stop it, or change the `ports` mapping in `docker-compose.yml`. |
| `sqlite3` build fails on `docker compose build` | Ensure the base image has `python3 make g++` (already in the Dockerfile). Try `docker compose build --no-cache backend`. |
| Frontend loads but "Network Error" on API calls | Verify `BACKEND_URL` points to a reachable host. From inside another container use `http://backend:3001`. From the host use `http://localhost:3001`. |
| HMR doesn't update after editing source | The frontend container bind-mounts `src/`, `index.html`, `vite.config.js`. If your file is outside those paths, rebuild: `docker compose up -d --build frontend`. |
| Stuck "Loading…" on a page | Open DevTools Network; check the `/api/*` response. The intentionally-verbose error handler will include a stack trace. |
| DB seems corrupted | Delete `backend/data/vulhealth.db`, then restart `backend`. |

## Healthcheck one-liner

```bash
curl -sf http://localhost:3001/health | jq && \
curl -sIf http://localhost:4000/ | head -1
```

Expected:

```
{ "status": "ok", "ts": 1714000000000 }
HTTP/1.1 200 OK
```
