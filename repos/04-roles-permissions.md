# 04 — Roles & Permissions (RBAC)

VulHealth defines **four roles**. This document describes the **intended** access policy so that reviewers know what the app *should* block. For the actual (weaker) implementation, cross-reference each row with [`06-security-notes.md`](./06-security-notes.md).

## Roles

| Role          | Self-registerable? | Seed count | Description                                              |
|---------------|--------------------|------------|----------------------------------------------------------|
| `patient`     | ✅ via `/register` | 20         | End-user; consumes care.                                 |
| `doctor`      | ❌ created by admin | 10         | Clinician owning a department.                           |
| `receptionist`| ❌ created by admin | 1          | Front-desk staff.                                        |
| `admin`       | ❌ seeded only      | 1          | Operational super-user.                                  |

## Intended permission matrix

Legend: ✅ allowed, ❌ blocked, ⚠️ allowed *only for own resources*, `—` not applicable.

### User & profile

| Action                                    | patient | doctor | reception | admin |
|-------------------------------------------|:-------:|:------:|:---------:|:-----:|
| Register self                             | ✅      | —      | —         | —     |
| View own profile (`GET /users/me`)        | ✅      | ✅     | ✅        | ✅    |
| Update own profile (`PUT /users/me`)      | ✅      | ✅     | ✅        | ✅    |
| Change own password                       | ✅      | ✅     | ✅        | ✅    |
| Change own role via profile update        | ❌      | ❌     | ❌        | ❌    |
| View another user's profile (`GET /users/:id`) | ⚠️ limited fields | ⚠️ | ⚠️ | ✅ |
| Create / update / delete other users      | ❌      | ❌     | ❌        | ✅    |

### Doctors directory

| Action                    | patient | doctor | reception | admin |
|---------------------------|:-------:|:------:|:---------:|:-----:|
| Browse doctors (public)   | ✅      | ✅     | ✅        | ✅    |
| Edit doctor's bio         | ❌      | ⚠️ own | ❌        | ✅    |

### Appointments

| Action                         | patient | doctor | reception | admin |
|--------------------------------|:-------:|:------:|:---------:|:-----:|
| Book for self                  | ✅      | ❌     | ✅ on behalf of a patient | ✅ |
| Book for another patient       | ❌      | ❌     | ✅        | ✅    |
| View own schedule              | ✅      | ✅     | ✅ (global) | ✅  |
| View another user's appointment| ❌      | ⚠️ where they are the assigned doctor | ✅ | ✅ |
| Change appointment status      | ❌      | ⚠️ own | ✅        | ✅    |
| Cancel appointment             | ⚠️ own  | ⚠️ own | ✅        | ✅    |

### Medical records

| Action                                  | patient | doctor | reception | admin |
|-----------------------------------------|:-------:|:------:|:---------:|:-----:|
| View own records (`GET /records/mine`)  | ✅      | —      | —         | —     |
| View another patient's record by ID     | ❌      | ⚠️ only records they authored or are treating the patient | ❌ | ✅ |
| Create a record                         | ❌      | ⚠️ as assigned doctor | ❌ | ✅ |
| Update a record                         | ❌      | ⚠️ records they authored | ❌ | ✅ |
| Upload attachment to a record           | ❌      | ⚠️ same   | ❌       | ✅    |
| Export records (XML)                    | ⚠️ own  | ⚠️ their patients | ❌ | ✅ |

### Messages

| Action                 | patient | doctor | reception | admin |
|------------------------|:-------:|:------:|:---------:|:-----:|
| Send message to user   | ✅      | ✅     | ✅        | ✅    |
| Read own inbox / sent  | ✅      | ✅     | ✅        | ✅    |
| Read another user's message| ❌  | ❌     | ❌        | ✅ (audit) |

### Admin tools

| Action                                    | patient | doctor | reception | admin |
|-------------------------------------------|:-------:|:------:|:---------:|:-----:|
| `GET /admin/users` (list incl. hashes)    | ❌      | ❌     | ❌        | ✅    |
| `PUT /admin/users/:id`                    | ❌      | ❌     | ❌        | ✅    |
| `POST /admin/ping`                        | ❌      | ❌     | ❌        | ✅    |
| `POST /admin/backup`                      | ❌      | ❌     | ❌        | ✅    |
| `GET /admin/logs`                         | ❌      | ❌     | ❌        | ✅    |
| `POST /admin/import/departments`          | ❌      | ❌     | ❌        | ✅    |

### Files

| Action                              | anonymous | authenticated any role |
|-------------------------------------|:---------:|:----------------------:|
| `GET /uploads/*` (static serve)     | ✅        | ✅                     |
| `POST /api/upload/avatar`           | ❌        | ✅ (overrides own avatar) |
| `GET  /api/upload/file?name=`       | ✅        | ✅                     |

## Middleware enforcement

- **`requireAuth`** (`src/middleware/auth.js`) — parses JWT from `Authorization: Bearer …` header or `token` cookie; rejects with 401 if invalid.
- **`requireRole(...roles)`** (`src/middleware/role.js`) — checks that `req.user.role ∈ roles`; rejects with 403 otherwise.

### Where middleware is applied today

| Route                                 | `requireAuth` | `requireRole` | Notes |
|---------------------------------------|:-------------:|:-------------:|-------|
| All `/api/auth/*`                     | ❌            | ❌            | public |
| All `/api/users/*`                    | ✅            | ❌            | no role gate — even on `/me/change-password` |
| All `/api/doctors`, `/api/departments`| ❌            | ❌            | public directory |
| `/api/appointments/*`                 | ✅            | ❌            | body-based ownership, not enforced |
| `/api/records/*`                      | ✅            | ❌            | ownership not enforced |
| `/api/messages/*`                     | ✅            | ❌            |       |
| `/api/admin/users` (GET)              | ✅            | ❌            | ⚠️ missing `requireRole('admin')` |
| `/api/admin/users/:id` (PUT)          | ✅            | ❌            | ⚠️ same |
| `/api/admin/ping`                     | ✅            | ❌            | ⚠️ same |
| `/api/admin/logs`                     | ✅            | ❌            | ⚠️ same |
| `/api/admin/import/departments`       | ✅            | ❌            | ⚠️ same |
| `/api/admin/backup`                   | ✅            | ✅ `admin`    | properly gated |

The rows marked with ⚠️ are the main A01 Broken Access Control findings documented in [`06-security-notes.md`](./06-security-notes.md).

## Future policy hardening (out of scope for this training target)

- ABAC layer per-resource (record owner check, appointment ownership).
- MFA for `admin` and `doctor` roles.
- Session rotation on privilege change.
- Audit log on every record access.
- Rate-limiting on `/api/auth/login` and `/api/auth/forgot-password`.
