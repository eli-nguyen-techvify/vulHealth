# VulHealth — Project Overview

> ⚠️ **Training / research only.** This application is intentionally vulnerable. Do not deploy to the public internet or use with real personal data. See [`06-security-notes.md`](./06-security-notes.md).

## What is VulHealth?

VulHealth is a small hospital management web application that demonstrates the full patient-care lifecycle: a patient discovers a doctor, books an appointment, attends it, reviews the resulting medical record, and messages the doctor for follow-up. Administrators manage departments, users, and system diagnostics. Doctors write medical records and communicate with their patients.

The app is built as a realistic (but deliberately insecure) test target for:

- manual pentest training against OWASP Top 10 (2021)
- automated pipelines such as Shannon (see [`05-setup-guide.md`](./05-setup-guide.md#running-shannon-against-vulhealth))
- internal security workshops and CTF-style exercises

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          Browser (Port 4000)                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  React SPA  (Vite dev server)                              │  │
│  │   - React Router for navigation                            │  │
│  │   - axios → /api/*  (proxied to backend)                   │  │
│  │   - localStorage for JWT session                           │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────────┘
                               │ HTTP (proxy or direct)
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Backend (Port 3001)                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Node.js + Express                                         │  │
│  │   • /api/auth       - login, register, password reset      │  │
│  │   • /api/users      - profile, avatar, password change     │  │
│  │   • /api/doctors    - directory & search                   │  │
│  │   • /api/departments                                        │  │
│  │   • /api/appointments                                       │  │
│  │   • /api/records    - medical records, export              │  │
│  │   • /api/messages   - inbox / sent / compose               │  │
│  │   • /api/admin      - user mgmt, diagnostics, import       │  │
│  │   • /api/upload     - file uploads                          │  │
│  │   • /api-docs       - Swagger UI (exposed)                 │  │
│  │                                                            │  │
│  │  Middleware:                                               │  │
│  │   • cors (permissive)                                      │  │
│  │   • express.json / urlencoded                              │  │
│  │   • cookie-parser                                          │  │
│  │   • requireAuth (JWT)                                      │  │
│  │   • requireRole (selectively applied)                      │  │
│  └─────────────────────────┬──────────────────────────────────┘  │
│                            │                                     │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  SQLite  (backend/data/vulhealth.db)                       │  │
│  │   • 7 tables — see 03-data-model.md                        │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## Tech stack

| Layer     | Choice                                     | Notes                                          |
|-----------|--------------------------------------------|------------------------------------------------|
| Frontend  | React 18 + Vite 5 + React Router 6          | Dev server on port 4000, proxies `/api` to backend |
| Backend   | Node.js 20 + Express 4                     | CommonJS, raw `sqlite3` driver (no ORM)        |
| Database  | SQLite 3 (file-based)                      | Seeded from `seed.sql` on first boot           |
| Auth      | JSON Web Tokens (HS256)                    | Stored in `localStorage`, also `Set-Cookie`    |
| Container | Docker + docker-compose (v2)               | Two services: `backend`, `frontend`            |
| Styling   | Plain CSS (Atlantis-inspired minimal)      | Single `styles.css` file                       |
| Icons     | Iconify CDN (Phosphor duotone collection)  | Line-art, colored via URL query param          |
| API docs  | OpenAPI 3.0 + swagger-ui-express           | Served at `/api-docs`                          |

## Project structure

```
vulhealth/
├── backend/
│   ├── src/
│   │   ├── index.js              (Express bootstrap)
│   │   ├── db.js                 (SQLite init + helpers)
│   │   ├── jwt.js                (HS256 sign/verify)
│   │   ├── middleware/
│   │   │   ├── auth.js           (requireAuth)
│   │   │   └── role.js           (requireRole)
│   │   └── routes/
│   │       ├── auth.js           (login, register, reset)
│   │       ├── users.js          (profile, avatar, password)
│   │       ├── doctors.js        (directory, search)
│   │       ├── departments.js
│   │       ├── appointments.js
│   │       ├── records.js        (medical records)
│   │       ├── messages.js
│   │       ├── admin.js          (ping, backup, logs, import)
│   │       └── upload.js
│   ├── seed.sql                  (6 depts, 15 doctors, 33 patients, 37 records, 70 messages, 70 appts)
│   ├── swagger.json              (OpenAPI 3.0 definition)
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.jsx, App.jsx, api.js, styles.css
│   │   ├── components/Navbar.jsx
│   │   └── pages/
│   │       ├── Landing.jsx, Login.jsx, Register.jsx, ForgotPassword.jsx
│   │       ├── Doctors.jsx, DoctorDetail.jsx, Search.jsx
│   │       ├── BookAppointment.jsx, MyAppointments.jsx
│   │       ├── MyRecords.jsx, RecordDetail.jsx
│   │       ├── Profile.jsx, Messages.jsx
│   │       ├── doctor/ (dashboard, patient records, write record)
│   │       └── admin/  (dashboard, user mgmt, diagnostics, import)
│   ├── vite.config.js
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── README.md                     (quick start)
└── VULN_MAP.md                   (cheat sheet with 39 PoCs)
```

## Domain glossary

| Term           | Meaning                                                                                   |
|----------------|-------------------------------------------------------------------------------------------|
| **Patient**    | End user who consumes health services — books appointments, reads their own records.     |
| **Doctor**     | Clinician assigned to one department; sees appointments, authors medical records.        |
| **Receptionist** | Front-desk staff; views the schedule and checks patients in.                           |
| **Admin**      | Operational staff with full system access.                                               |
| **Department** | Specialty unit (Cardiology, Dermatology, Pediatrics, …). Each doctor belongs to one.     |
| **Appointment**| A scheduled meeting between one patient and one doctor at a specific time.               |
| **Medical Record** | The clinical note authored by the doctor after an appointment (diagnosis + Rx + notes). |
| **Message**    | Free-text inbox communication between two users (usually patient ↔ doctor).              |
| **Session**    | A JWT granted at login, used for API authentication.                                     |

