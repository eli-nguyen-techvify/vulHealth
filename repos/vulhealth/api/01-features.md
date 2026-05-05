# 01 — Features & Functional Requirements

This document describes what the app **is supposed to do** from an end-user perspective. It groups functionality by role. For each feature we list the user story, the key UI/API entry points, and any business rule.

> Real-world security expectations (access control, auth) are described in [`../auth/04-roles-permissions.md`](../auth/04-roles-permissions.md). The actual implementation has intentional gaps — see [`../06-security-notes.md`](../06-security-notes.md).

## Public (no login)

### F-01  Browse departments
- **User story**: As a visitor I can see the six hospital departments, what each one treats, and who heads it, so I decide where to go.
- **UI**: Landing page "Our departments" grid; `/doctors?departmentId=<id>` filter on doctor directory.
- **API**: `GET /api/departments`, `GET /api/departments/:id`.

### F-02  Browse doctors
- **User story**: As a visitor I can search doctors by name, specialty keyword, or department.
- **UI**: `/doctors` grid; search box on Landing.
- **API**: `GET /api/doctors?q=<term>&departmentId=<id>`, `GET /api/doctors/:id`.

### F-03  Read doctor profile
- **User story**: As a visitor I can open a doctor's page and read their bio, contact info, and the department they work in.
- **UI**: `/doctors/:id`.
- **API**: `GET /api/doctors/:id`.

### F-04  Patient self-registration
- **User story**: As a visitor I can create a patient account with username, email, password, full name, DOB, and phone.
- **UI**: `/register` form.
- **API**: `POST /api/auth/register` → returns JWT on success.
- **Business rules**:
  - Username and email must be unique.
  - New accounts are always `role = patient`.

### F-05  Login
- **User story**: As any user I can authenticate with username + password.
- **UI**: `/login` form (or keyboard shortcut via Navbar link).
- **API**: `POST /api/auth/login` → returns JWT + user profile.
- **Post-login redirects**: admin → `/admin`, doctor → `/doctor`, receptionist → `/appointments`, patient → `/`.
- **Role-aware navbar**: only patient and guest see a "Home" link. Doctor sees Doctor Panel / Appointments / Patients / Write record / Messages. Receptionist sees Appointments / Doctors / Messages. Admin sees Admin / Messages (the navbar itself is hidden under `/admin`).

### F-06  Password reset (self-serve)
- **User story**: If I forget my password, I can request a reset token sent to my registered email.
- **UI**: `/forgot-password` → enter email → receive reset link.
- **API**: `POST /api/auth/forgot-password`, then `POST /api/auth/reset-password` with the token.
- **Business rules**:
  - Each token is single-use.
  - Tokens stored in `password_resets`.
  - *(In production, tokens would be emailed; in dev we show them in the response for testing.)*

---

## Patient role

### F-07  Book appointment
- **User story**: As a patient I can choose a department + doctor + date/time + reason and book a slot.
- **UI**: `/book` form; entry point from doctor profile.
- **API**: `POST /api/appointments`.
- **Business rules (intended)**:
  - The appointment is booked under the authenticated patient's ID.
  - The slot should not conflict with the doctor's existing schedule. *(Not enforced — see `06-security-notes.md`.)*
  - Status initially `booked`.

### F-08  View my appointments
- **User story**: As a patient I see a table of my upcoming and past appointments.
- **UI**: `/appointments`. Each row has a **View** button that opens an *Appointment detail* modal (status, scheduled-at, doctor, department, reason, created-at; for the patient also DOB & phone).
- **API**: `GET /api/appointments/mine`, `GET /api/appointments/:id`.

### F-09  Cancel appointment
- **User story**: As a patient I can cancel an upcoming appointment up to 2 hours before the slot. *(2h rule is UX copy; backend does not enforce.)*
- **UI**: `/appointments` → Cancel action.
- **API**: `DELETE /api/appointments/:id`.

### F-10  View my medical records
- **User story**: As a patient I can see a list of my medical records and open each one to read diagnosis, prescription, and doctor notes.
- **UI**: `/records`, `/records/:id`.
- **API**: `GET /api/records/mine`, `GET /api/records/:id`.

### F-11  Message my doctor
- **User story**: As a patient I can start a conversation with any doctor (typically one I've seen) through an inbox.
- **UI**: `/messages` (compose + inbox/sent tabs).
- **API**: `POST /api/messages`, `GET /api/messages/inbox`, `GET /api/messages/sent`, `GET /api/messages/:id`.
- **Business rules**: Supports rich HTML in message bodies. *(This is a deliberate design flaw — see stored XSS note.)*

### F-12  Update my profile
- **User story**: As any user I can update my full name, email, phone, avatar, and bio.
- **UI**: `/profile`.
- **API**: `PUT /api/users/me`.
- **Business rules (intended)**: Only `fullName`, `email`, `phone`, `avatarUrl`, and `bio` may be changed. *(The implementation merges the whole body — see mass-assignment note.)*

### F-13  Upload avatar
- **User story**: I can upload a profile picture from my device, or import one from a URL.
- **UI**: `/profile` → "Avatar" section.
- **API**: `POST /api/upload/avatar` (multipart), `POST /api/users/me/avatar-from-url` (JSON with `url`).
- **Business rules (intended)**: Only image formats (JPEG/PNG/GIF), max 2 MB, fetched URL must be https://… external. *(Not enforced — see unrestricted-upload and SSRF notes.)*

### F-14  Change password
- **User story**: As any user I can rotate my password from the profile page.
- **UI**: `/profile` → "Change Password".
- **API**: `POST /api/users/me/change-password`.
- **Business rules (intended)**: Current password must be verified. *(Not enforced — see 06-security-notes.)*

---

## Doctor role

### F-15  Doctor dashboard
- **User story**: As a doctor I land on a dashboard summarising my workload.
- **UI**: `/doctor`. Sections:
  - Welcome card (avatar + name + role pill + quick actions: Write record / Lookup / Messages).
  - 4 stat tiles — Total / Today / Upcoming / Completed.
  - **Today's schedule** table (sorted by time) with **View** + **Write** actions; the **Write** button deep-links to `/doctor/write-record?appointmentId=<id>`.
  - **Upcoming appointments** (booked + scheduledAt ≥ today, top 8).
  - **Recent completed** (top 5 done).
  - Appointment detail modal (shared component with `MyAppointments`).
- **API**: `GET /api/appointments/mine`, `GET /api/appointments/:id`.

### F-16  My patients
- **User story**: As a doctor I see a directory of all patients I have appointments or records with, can search, and drill into a single patient to review their visits and chart.
- **UI**: `/doctor/patients`.
  - Patient directory table (ID, Name, Visits, Records, Last visit) with search box.
  - Stat tiles — Total patients / Appointments / Records authored / Upcoming visits.
  - Click **Open** → patient detail screen with avatar + per-patient stat tiles, appointments list, records list, and a record-detail modal.
  - "Quick lookup by record ID" utility kept at the bottom for compatibility.
- **API**: `GET /api/appointments/mine`, `GET /api/records/by-doctor`, `GET /api/records/by-patient/:patientId`, `GET /api/records/:id`.

### F-17  Write medical record
- **User story**: After an appointment, as the attending doctor I write the diagnosis, prescription, and notes — and the appointment status flips to `done` automatically.
- **UI**: `/doctor/write-record`. Supports deep-link `?appointmentId=<id>` from the dashboard.
  - Dropdown of *open appointments* (doctor's appointments not already recorded, status ≠ `cancelled`).
  - Selecting an appointment auto-fills `patientId` (read-only) and shows a Visit-context card.
  - Optional checkbox **Mark this appointment as done after saving** (default on).
  - On save: `POST /api/records`, then `PATCH /api/appointments/:id/status` with `{ "status": "done" }`, then refresh.
- **API**: `POST /api/records`, `PATCH /api/appointments/:id/status`, `GET /api/records/by-doctor`.
- **Business rules (intended)**: The record author must be the doctor who owns the referenced appointment. *(Not enforced.)*

### F-18  Upload attachment (lab, X-ray)
- **User story**: As a doctor I can attach a file (lab PDF, X-ray JPG) to a medical record.
- **API**: `POST /api/records/:id/attachment`.

### F-19  Export records (XML)
- **User story**: As a doctor I can export a patient's record history as XML for external interop.
- **API**: `GET /api/records/export`.

### F-20  Doctor inbox
- **User story**: As a doctor I read/reply to messages from my patients.
- **UI**: `/messages` (same as patient).

---

## Receptionist role

### F-21  View daily schedule
- **User story**: As a receptionist I see today's appointments across all doctors so I can greet patients.
- **UI**: `/appointments` (views all appointments for the hospital). *(Intended — currently receptionist uses the patient `/mine` endpoint.)*

### F-22  Check patient in
- **User story**: Flip an appointment status from `booked` → `checked_in` when the patient arrives.
- **API**: `PUT /api/appointments/:id` *(not yet implemented as a dedicated receptionist action — future work.)*

---

## Admin role

### F-23  User management
- **User story**: As an admin I can list all users, promote/demote roles, assign doctors to departments, ban/unban accounts, generate temp passwords, and delete users.
- **UI**: `/admin/users` — table columns: ID, Username, **Full name**, Email, Role, Password hash, Edit.
- **API**: `GET /api/admin/users`, `PUT /api/admin/users/:id`, `DELETE /api/admin/users/:id`, `POST /api/admin/users/:id/ban|unban`, `POST /api/admin/users/:id/reset-password`.

### F-23a  Admin dashboard (overview)
- **User story**: As an admin I land on a control panel that shows the system at a glance.
- **UI**: `/admin`. Sections:
  - Welcome card with avatar + role pill + quick actions.
  - 4 stat tiles — Total users, Appointments, Medical records, Banned users.
  - "Users by role" table with role pills.
  - "Appointments by status" table with badge pills.
  - "Recent admin activity" table (latest 8 audit-log entries).
  - "Quick links" tiles to other admin pages and Swagger.
- **API**: `GET /api/admin/stats`, `GET /api/admin/audit-log`.

### F-24  System diagnostics — ping
- **User story**: As an admin I can ping a hostname from the server to check network reachability between the backend and external systems.
- **UI**: `/admin/diagnostics` → "Ping Diagnostic" form.
- **API**: `POST /api/admin/ping` (body: `{ host }`).

### F-25  View server logs
- **User story**: As an admin I read the server log files from the Diagnostics page.
- **UI**: `/admin/diagnostics` → "View Server Logs".
- **API**: `GET /api/admin/logs?file=<path>`.
- **Business rules (intended)**: Only files inside `data/logs/` are viewable. *(Not enforced — see path-traversal note.)*

### F-26  Backup database
- **User story**: As an admin I trigger a DB backup to a filename I choose.
- **API**: `POST /api/admin/backup`.

### F-27  Import departments from URL
- **User story**: As an admin I can sync department definitions by pointing to a remote XML feed.
- **UI**: `/admin/import`.
- **API**: `POST /api/admin/import/departments` (body: `{ url }`).
- **Business rules (intended)**: The URL must be an HTTPS endpoint on an allowlisted host. *(Not enforced — see SSRF note.)*

---

## Cross-cutting

### F-28  Banner endpoint
`GET /` returns the app name, version, and docs link. Useful for crawlers and fingerprinting.

### F-29  Health check
`GET /health` returns `{ status: "ok", ts: <epoch> }`. Stateless and unauthenticated.

### F-30  OpenAPI docs
`GET /api-docs` serves an interactive Swagger UI. In production this would be gated; here it is public by design.

### F-31  Generic HTTP redirect helper
`GET /api/redirect?url=<target>` issues a 302 to the supplied URL. Useful for deep-linking from email campaigns.
