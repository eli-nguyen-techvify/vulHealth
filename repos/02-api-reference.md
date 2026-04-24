# 02 — API Reference

All endpoints are served from the Express backend at **`http://localhost:3001`** (or `http://host.docker.internal:3001` from Docker containers). The Vite dev server on port 4000 proxies `/api/*` to the backend, so the same paths work from the browser.

## Conventions

- Content type: `application/json` (except file uploads → `multipart/form-data`, file download responses).
- Auth: `Authorization: Bearer <JWT>` header, or the `token` cookie set on login.
- Error shape: `{ "error": "human message", "stack"?: "…" }`. 5xx responses leak the server stack trace (intentional misconfiguration — see 06-security-notes).
- Timestamps are ISO strings from SQLite (`YYYY-MM-DD HH:MM:SS`).
- IDs are monotonic integers.

## Quick reference (all endpoints)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET  | `/` | — | — | Banner |
| GET  | `/health` | — | — | Liveness probe |
| GET  | `/api-docs` | — | — | Swagger UI |
| GET  | `/api/redirect?url=` | — | — | Redirect helper |
| POST | `/api/auth/register` | — | — | Create patient |
| POST | `/api/auth/login` | — | — | Auth, returns JWT |
| POST | `/api/auth/logout` | — | — | Clear cookie |
| POST | `/api/auth/forgot-password` | — | — | Issue reset token |
| POST | `/api/auth/reset-password` | — | — | Consume reset token |
| GET  | `/api/auth/oauth/callback` | — | — | Mock OAuth landing |
| GET  | `/api/users/me` | ✓ | any | Current user |
| PUT  | `/api/users/me` | ✓ | any | Update profile |
| POST | `/api/users/me/change-password` | ✓ | any | Rotate password |
| POST | `/api/users/me/avatar-from-url` | ✓ | any | Import avatar from URL |
| GET  | `/api/users/:id` | ✓ | any | Public-ish profile lookup |
| GET  | `/api/doctors` | — | — | Directory (search/filter) |
| GET  | `/api/doctors/:id` | — | — | Doctor detail |
| GET  | `/api/departments` | — | — | List departments |
| GET  | `/api/departments/:id` | — | — | Department + its doctors |
| POST | `/api/appointments` | ✓ | patient | Book |
| GET  | `/api/appointments/mine` | ✓ | any | List my appointments |
| GET  | `/api/appointments/:id` | ✓ | any | Appointment detail |
| DELETE | `/api/appointments/:id` | ✓ | any | Cancel |
| POST | `/api/records` | ✓ | doctor | Create record |
| GET  | `/api/records/mine` | ✓ | patient | My records |
| GET  | `/api/records/:id` | ✓ | any | Record detail |
| PUT  | `/api/records/:id` | ✓ | doctor | Update record |
| POST | `/api/records/:id/attachment` | ✓ | doctor | Attach file |
| GET  | `/api/records/export?format=xml` | ✓ | patient | Export my records |
| POST | `/api/messages` | ✓ | any | Send message |
| GET  | `/api/messages/inbox` | ✓ | any | Inbox |
| GET  | `/api/messages/sent` | ✓ | any | Sent items |
| GET  | `/api/messages/:id` | ✓ | any | Message body |
| GET  | `/api/admin/users` | ✓ | admin | List all users |
| PUT  | `/api/admin/users/:id` | ✓ | admin | Update any user |
| POST | `/api/admin/ping` | ✓ | admin | Diagnostic ping |
| POST | `/api/admin/backup` | ✓ | admin | Backup DB |
| GET  | `/api/admin/logs?file=` | ✓ | admin | Read log file |
| POST | `/api/admin/import/departments` | ✓ | admin | Import via URL |
| POST | `/api/upload/avatar` | ✓ | any | Upload avatar (multipart) |
| GET  | `/api/upload/file?name=` | — | — | Download upload |
| GET  | `/uploads/*` | — | — | Static files |

---

## Authentication

### `POST /api/auth/register`

Create a new **patient** account.

Request:
```json
{
  "username": "alice",
  "email":    "alice@mail.com",
  "password": "hunter2",
  "fullName": "Alice Johnson",
  "dob":      "1992-05-11",
  "phone":    "+1-555-1001"
}
```

Success (200):
```json
{
  "token": "<JWT>",
  "user":  { "id": 12, "username": "alice", "email": "alice@mail.com", "role": "patient", "fullName": "Alice Johnson" }
}
```

Errors: `400` missing fields · `409` username/email taken.

### `POST /api/auth/login`

Request:
```json
{ "username": "alice", "password": "hunter2" }
```

Success (200):
```json
{
  "token": "<JWT>",
  "user":  { "id": 12, "username": "alice", "email": "…", "role": "patient", "fullName": "…" }
}
```

Also sets a `Set-Cookie: token=<JWT>; SameSite=Lax` cookie.

Errors:
- `400` missing fields
- `401` `"No account found with username: …"` (user does not exist)
- `401` `"Invalid password for user: …"` (user exists, wrong password)

### `POST /api/auth/forgot-password`
Request: `{ "email": "…" }` → Response includes `debug_token` and `reset_url` for testing.

### `POST /api/auth/reset-password`
Request: `{ "email", "token", "newPassword" }` → 200 on success.

### `GET /api/auth/oauth/callback?redirect=<url>`
Returns 302 to `redirect`. Intended as a stub for future OAuth flows.

### `POST /api/auth/logout`
Clears the `token` cookie. Returns `{ "message": "logged out" }`.

---

## Users

### `GET /api/users/me`
Returns the full profile of the authenticated user.

### `PUT /api/users/me`
Body is the profile to merge. Any absent field keeps its prior value.

### `POST /api/users/me/change-password`
Body: `{ "newPassword": "…" }`.

### `POST /api/users/me/avatar-from-url`
Body: `{ "url": "https://example.com/pic.jpg" }`. Server fetches the URL and returns the payload for download.

### `GET /api/users/:id`
Returns another user's profile (limited fields).

---

## Doctors

### `GET /api/doctors`
Query params: `q`, `departmentId`.
Response:
```json
{
  "query": "smith",
  "departmentId": null,
  "count": 1,
  "doctors": [ { "id": 2, "username": "dr.smith", "fullName": "Dr. John Smith", "phone": "+1-555-0201", "avatarUrl": null, "departmentId": 1, "bio": "…" } ]
}
```

### `GET /api/doctors/:id`
Single doctor record. 404 if not a doctor.

---

## Departments

### `GET /api/departments`
Array of `{ id, name, description, headDoctorId, headDoctorName }`.

### `GET /api/departments/:id`
Department object + `doctors` array under the same `departmentId`.

---

## Appointments

### `POST /api/appointments`
Request:
```json
{
  "patientId":    12,
  "doctorId":     2,
  "departmentId": 1,
  "scheduledAt":  "2026-05-02 09:00",
  "reason":       "Chest pain"
}
```
If `patientId` is omitted, the server uses the authenticated user's ID.

Response: `{ "id": 31, "patientId": 12, "doctorId": 2, "scheduledAt": "…" }`.

### `GET /api/appointments/mine`
Returns appointments for the authenticated user (patient or doctor view is auto-selected by role).

### `GET /api/appointments/:id`
Full joined view with patient & doctor names, department.

### `DELETE /api/appointments/:id`
Marks the appointment as `cancelled` (status update, soft delete). Returns `{ "message": "cancelled" }`.

---

## Medical records

### `POST /api/records`
Request:
```json
{
  "patientId": 12,
  "doctorId":  2,
  "appointmentId": 1,
  "diagnosis":    "Stable angina",
  "prescription": "Aspirin 81mg daily",
  "notes":        "ECG shows mild ST depression."
}
```
`doctorId` defaults to the authenticated user.

### `GET /api/records/mine`
Records where `patientId == me`, joined with doctor name.

### `GET /api/records/:id`
Joined with patient name, DOB, and doctor name.

### `PUT /api/records/:id`
Partial update: `diagnosis`, `prescription`, or `notes` (any subset).

### `POST /api/records/:id/attachment`
`multipart/form-data` with a `file` part. Optional `filename` body field overrides the on-disk name.

### `GET /api/records/export?format=xml`
Returns XML of the authenticated user's records (limit 20).

---

## Messages

### `POST /api/messages`
```json
{ "toUserId": 2, "subject": "follow-up", "body": "<p>Pain returned.</p>" }
```
Bodies are stored verbatim — rendered as HTML on read.

### `GET /api/messages/inbox`
Array of messages where `toUserId == me`, newest first.

### `GET /api/messages/sent`
Mirror of `/inbox` for outgoing messages.

### `GET /api/messages/:id`
One message with sender & recipient resolved to names.

---

## Admin

### `GET /api/admin/users`
Returns every user in the system including the password-hash column.

### `PUT /api/admin/users/:id`
Same merge semantics as `PUT /api/users/me`. Intended to let admins promote/demote roles.

### `POST /api/admin/ping`
```json
{ "host": "127.0.0.1" }
```
Server runs `ping -c 1 <host>` and returns stdout, stderr, and the constructed command string.

### `POST /api/admin/backup`
```json
{ "filename": "backup-2026-04-24.db" }
```
Copies `data/vulhealth.db` to `data/<filename>`.

### `GET /api/admin/logs?file=<name>`
Reads a file from `data/logs/`.

### `POST /api/admin/import/departments`
```json
{ "url": "https://hospital-ops.example/departments.xml" }
```
The server fetches the URL and returns a preview of the body.

---

## Upload

### `POST /api/upload/avatar`
`multipart/form-data`:
- `file` — binary
- `filename` (optional) — overrides on-disk name.

Server stores the file under `backend/uploads/` and updates the user's `avatarUrl`.

### `GET /api/upload/file?name=<filename>`
Reads a file from `backend/uploads/` and returns its bytes. No auth required.

### `GET /uploads/*`
Static file server for everything inside `backend/uploads/`. No directory listing.

---

## JWT payload

```json
{
  "id":       12,
  "username": "alice",
  "role":     "patient",
  "email":    "alice@mail.com",
  "iat":      1714000000
}
```
Signed with HS256. Secret is read from the `JWT_SECRET` env var (defaults to the literal string `secret`).

## OpenAPI

A machine-readable definition (subset) is served at `/api-docs`. The source lives at `backend/swagger.json`.
