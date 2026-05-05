# VulHealth — Intentionally Vulnerable Hospital Web App

> ⚠️ **WARNING**: This application is **deliberately insecure**. Do NOT deploy it to the public internet, do NOT use real personal data, and do NOT expose it beyond your local machine / isolated lab network. It is meant only for:
> - Personal pentest training
> - Testing automated pentest tools (e.g. [Shannon](../shannon/))
> - CTF / lab demonstrations

## What it is

A mini hospital management system (React + Node.js + SQLite) with:
- **4 user roles**: Patient, Doctor, Receptionist, Admin
- **6 departments**: Cardiology, Internal Medicine, Dermatology, Pediatrics, Obstetrics, Radiology
- **Full stack**: login, appointment booking, medical records, messaging, doctor profiles, admin panel, file upload

And **all of the OWASP Top 10 (2021)** plus bonus lows/meds. See [VULN_MAP.md](./VULN_MAP.md) for the full cheat sheet + PoC curl commands.

## Run

```bash
cd vulhealth
docker-compose up --build
```

- Frontend (for browser / Shannon target): http://localhost:4000
- Backend API: http://localhost:3001/api/*
- Swagger docs: http://localhost:3001/api-docs

First startup will seed `backend/data/vulhealth.db` (6 departments, 10 doctors, 20 patients, 30 medical records). Delete that file and restart to reset.

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

## Running Shannon against it

Assuming you built Shannon (see `../shannon/`):

1. Make the VulHealth docs available to Shannon as the target's documentation folder. From the repo root:

   ```bash
   ln -s "$(pwd)/vulhealth/repos" "$(pwd)/shannon/repos/vulhealth"
   ```
   (or `cp -r vulhealth/repos shannon/repos/vulhealth` if you prefer a copy)

2. Start the run from the shannon dir:

   ```bash
   cd ../shannon
   ./shannon start \
       URL=http://host.docker.internal:4000 \
       REPO=vulhealth \
       CONFIG=./configs/vulhealth.yaml
   ```

`shannon/configs/vulhealth.yaml` is preconfigured for **multi-persona testing** — all four roles (patient `alice`, doctor `dr.smith`, receptionist `reception`, admin `admin`) run in parallel so the authz exploit phase can demonstrate cross-role IDOR (e.g. alice reading dr.smith's medical records) and vertical privilege escalation (e.g. alice hitting `/api/admin/users`).

If you want a single-persona run instead, edit `shannon/configs/vulhealth.yaml` and replace the `personas: [...]` block with a single `credentials: { username: ..., password: ... }` block — the parser auto-migrates the legacy form.

## Reset the database

```bash
rm backend/data/vulhealth.db
docker-compose restart backend
```

## Project layout

```
vulhealth/
├── backend/                  # Express + SQLite API (port 3001)
│   ├── src/
│   │   ├── index.js
│   │   ├── db.js  jwt.js
│   │   ├── middleware/
│   │   └── routes/
│   ├── seed.sql
│   └── swagger.json
├── frontend/                 # React + Vite SPA (port 4000)
│   ├── src/pages/
│   └── vite.config.js
├── docker-compose.yml
├── README.md
└── VULN_MAP.md               # cheat sheet
```

## Disclaimer

This software is provided for educational and research purposes only. The authors take no responsibility for misuse. You are responsible for complying with all applicable laws.
