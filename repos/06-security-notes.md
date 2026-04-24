# 06 — Security Notes & Threat Model

> ⚠️ **This app is intentionally insecure.** Every weakness below is deliberate. Do NOT use in production, do NOT put real data in it, and do NOT expose it beyond a lab network.

This document summarises the security posture of VulHealth for auditors, students, and automated pipeline operators. The complete catalogue of exploit primitives with copy-paste curl commands lives in the top-level [`VULN_MAP.md`](../VULN_MAP.md).

## Purpose

VulHealth is a training target whose job is to **fail** certain classes of security checks. It exercises the complete OWASP Top 10 (2021) with enough verisimilitude (roles, sensitive data, realistic flows) that automated pipelines like Shannon can produce meaningful reports.

## Threat model (informal)

| Adversary                 | Capability                                          | Goal                                             |
|---------------------------|-----------------------------------------------------|--------------------------------------------------|
| **External unauth user**  | Hit any public endpoint (HTTP, no TLS)              | Discover sensitive data, harvest credentials.    |
| **Registered patient**    | Hold a valid patient JWT                            | Escalate to admin, read other patients' records. |
| **Malicious doctor**      | Hold a valid doctor JWT                             | Read records they do not own; plant XSS.         |
| **Compromised admin**     | Hold a valid admin JWT                              | Execute commands on the server, exfiltrate DB.   |
| **Automated crawler**     | Full Shannon/ZAP/Burp scan                          | Discover the above without manual guidance.      |

## OWASP Top 10 (2021) coverage

| OWASP                                           | Status | Representative sink                              |
|-------------------------------------------------|:------:|--------------------------------------------------|
| A01 – Broken Access Control                     | ✅     | BOLA on `/api/records/:id`; missing role guards  |
| A02 – Cryptographic Failures                    | ✅     | MD5 password hashes; JWT secret = `"secret"`     |
| A03 – Injection                                 | ✅     | SQLi in login & search; command injection        |
| A04 – Insecure Design                           | ✅     | No rate limits; predictable reset tokens         |
| A05 – Security Misconfiguration                 | ✅     | CORS `*` + credentials; stack traces; Swagger    |
| A06 – Vulnerable & Outdated Components          | ✅     | Pinned `lodash@4.17.15` (CVE-2019-10744)         |
| A07 – Identification & Auth Failures            | ✅     | Username enumeration; weak pw policy             |
| A08 – Software & Data Integrity Failures        | ✅     | Mass assignment; JWT `alg:none`                  |
| A09 – Security Logging & Monitoring Failures    | ✅     | No audit trail on record access                  |
| A10 – Server-Side Request Forgery               | ✅     | Avatar-from-URL; admin XML import                |

Full PoC commands for each: [`VULN_MAP.md`](../VULN_MAP.md).

## Intentional weaknesses — concise list

Grouped by layer for quick orientation.

### Authentication
- MD5 hashing of passwords (`backend/src/routes/auth.js` → `md5()`).
- Username enumeration: different 401 messages for "no user" vs "wrong password".
- No rate limit, no account lockout.
- Weak password policy at registration (≥1 char accepted).
- Predictable password reset token (`md5(email + Date.now())`).
- Reset-token response leaks the token (dev convenience).
- `POST /api/users/me/change-password` does not require the current password.

### Session / tokens
- JWT signed with `HS256` and the literal secret `"secret"`.
- Token verification accepts `alg: none` (see `backend/src/jwt.js`).
- Cookie `token` lacks `HttpOnly`, `Secure`, `SameSite=Strict`.
- Session fixation: token is not rotated on privilege change.

### Authorization (A01)
- `GET /api/records/:id` — any authenticated user can read any medical record (BOLA).
- `GET /api/appointments/:id` — any authenticated user can read any appointment (IDOR).
- `POST /api/appointments` — `patientId` comes from the body; can book for another patient.
- `GET /api/admin/users`, `POST /api/admin/ping`, `GET /api/admin/logs`, `POST /api/admin/import/*`, `PUT /api/admin/users/:id` — only `requireAuth`, no `requireRole('admin')`.
- `POST /api/users/me/avatar-from-url` — SSRF (can hit `http://169.254.169.254/...`, localhost services, internal network).
- `GET /api/admin/logs?file=` — path traversal.
- `GET /api/upload/file?name=` — path traversal, unauthenticated.

### Injection (A03)
- `POST /api/auth/login` — SQL concatenation with `username` (classic auth bypass).
- `GET /api/doctors?q=…` — SQL concatenation.
- `GET /api/doctors/:id`, `GET /api/departments/:id` — SQL concatenation on path params.
- `POST /api/admin/ping` — shell concat on `host`.
- `POST /api/admin/backup` — shell concat on `filename`.
- Stored XSS:
  - `messages.body` → rendered via `dangerouslySetInnerHTML` on inbox.
  - `users.bio` → rendered on doctor profile.
  - `medical_records.diagnosis / prescription / notes` → rendered on record detail.
- Reflected XSS:
  - `/search?q=` → rendered raw.

### Misconfiguration (A05)
- `cors({ origin: reflect, credentials: true })`.
- Global error handler returns `{ error, stack, sql }` in production responses.
- Swagger UI and raw `swagger.json` publicly reachable.
- Default / weak credentials seeded.
- `/api/auth/forgot-password` leaks the reset token.

### Integrity (A08)
- `PUT /api/users/me` and `PUT /api/admin/users/:id` merge `req.body` with `_.merge(...)`; the attacker controls `role`, leading to privilege escalation.
- `lodash@4.17.15` is vulnerable to prototype pollution via `_.merge` — see CVE-2019-10744.

### SSRF (A10)
- `POST /api/users/me/avatar-from-url` — arbitrary scheme + host.
- `POST /api/admin/import/departments` — same.

### Uploads
- `POST /api/upload/avatar` — any file type, attacker-controlled filename (path traversal), no size cap.
- `POST /api/records/:id/attachment` — same.

## Suggested remediations (for learners)

When reviewing the codebase after a pentest, the minimal fixes map cleanly to each layer:

| Finding                       | One-line fix                                                                 |
|-------------------------------|------------------------------------------------------------------------------|
| MD5 hashes                    | `bcrypt.hash(pw, 12)` / `argon2.hash()`                                      |
| JWT `alg:none` accepted       | Whitelist `HS256` / use `jsonwebtoken.verify()` with explicit algorithm list |
| JWT secret `"secret"`         | Generate ≥256-bit random secret, load from env, rotate                       |
| SQL string concatenation      | Parameterised queries (`?` placeholders already used in safe routes)         |
| Shell concatenation (ping)    | `execFile('ping', ['-c', '1', host])` + strict input regex                   |
| BOLA on records               | `WHERE r.id = ? AND r.patientId = ?` + doctor-ownership check                |
| Missing admin role check      | `router.use(requireAuth, requireRole('admin'))` on the admin router          |
| Mass assignment               | Allowlist fields explicitly: `{ fullName, phone, bio }`                      |
| Stored XSS (messages, bio)    | Server-side sanitisation with DOMPurify / `sanitize-html`                    |
| Reflected XSS                 | Don't use `dangerouslySetInnerHTML`; render as text                          |
| SSRF                          | Allowlist hostnames, block RFC1918 / `169.254/16`, enforce https             |
| Path traversal                | Validate `path.basename()` equals input; chroot to upload dir                |
| Username enumeration          | Return the same generic 401 message in both branches                         |
| Rate limit                    | `express-rate-limit` on `/auth/login` and `/auth/forgot-password`            |
| CORS                          | Allowlist trusted origins; never reflect unknown origin with credentials     |
| Verbose errors                | In production: strip `stack` / `sql` from responses                          |
| Default creds                 | Force password change on first login                                         |

## Compliance framing

If this were a real hospital system, many of the above issues would also be regulatory findings:

- **HIPAA (US)** — PHI access logging, minimum-necessary access, encryption at rest → multiple violations.
- **GDPR (EU)** — pseudonymisation, access control, breach notification → multiple violations.
- **PCI-DSS** (if billing were real) — n/a (no card data), but the general principles of access control apply.

We use these framings in training to connect technical findings to real-world consequences, but no compliance evidence is collected.

## Reporting expected from Shannon

When running Shannon against this target with the bundled config, expect findings across these classes (approximate; varies run to run):

- SQLi — login auth bypass
- SQLi — union-based data exfil via doctor search
- Command Injection — admin ping
- Stored XSS — message body
- Reflected XSS — `/search?q=`
- BOLA — `/api/records/:id`
- IDOR — `/api/appointments/:id`
- Broken Access Control — `/api/admin/*` without role
- SSRF — avatar-from-URL
- Mass assignment — `PUT /api/users/me`
- Default credentials — `admin/admin123`, `dr.weak/123456`
- Weak JWT — secret guessable / `alg:none` accepted
- Username enumeration on login
- Verbose error disclosure

Total: **~12 to 18 findings** per run.

## Contact

For training-session questions: whoever ran `docker compose up`. This is a lab artefact; there is no vendor to report bugs to.
