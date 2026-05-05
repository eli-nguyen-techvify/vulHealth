# 03 — Data Model

SQLite database stored at `backend/data/vulhealth.db`. The schema and seed are both defined in `backend/seed.sql`. On first boot, `db.init()` (in `backend/src/db.js`) checks whether the `users` table exists; if not, it executes the seed script.

## Entity–Relationship diagram (ASCII)

```
                                   ┌──────────────────┐
                                   │   departments    │
                                   ├──────────────────┤
                                   │ id          PK   │
                                   │ name        UQ   │
                                   │ description      │
                                   │ headDoctorId FK ──┐
                                   └──────────────────┘│
                                             ▲         │
                                   (doctor assigned)   │
                                             │         │
┌──────────────────────┐                     │         │
│       users          │─────────────────────┘         │
├──────────────────────┤                               │
│ id              PK   │◀──┐        ┌──────────────────┘
│ username        UQ   │   │        │
│ email           UQ   │   │        │
│ passwordHash    MD5  │   │        ▼
│ role            ENUM │   │   ┌──────────────────────────┐
│ fullName             │   │   │     appointments         │
│ dob                  │   │   ├──────────────────────────┤
│ phone                │   │   │ id                  PK   │
│ avatarUrl            │   │───│ patientId           FK   │
│ departmentId    FK   │   │   │ doctorId            FK   │───► users
│ bio                  │   │   │ departmentId        FK   │───► departments
│ createdAt            │   │   │ scheduledAt              │
└──────────────────────┘   │   │ status (booked|done|…)   │
                           │   │ reason                   │
                           │   │ createdAt                │
                           │   └──────────────────────────┘
                           │            ▲
                           │            │ (optional link)
                           │            │
                           │   ┌──────────────────────────┐
                           │   │    medical_records       │
                           │   ├──────────────────────────┤
                           │   │ id                  PK   │
                           │───│ patientId           FK   │
                           │───│ doctorId            FK   │
                           │   │ appointmentId       FK   │
                           │   │ diagnosis                │
                           │   │ prescription             │
                           │   │ notes                    │
                           │   │ attachmentPath           │
                           │   │ createdAt                │
                           │   └──────────────────────────┘
                           │
                           │   ┌──────────────────────────┐
                           │   │        messages          │
                           │   ├──────────────────────────┤
                           │   │ id                  PK   │
                           │───│ fromUserId          FK   │
                           │───│ toUserId            FK   │
                           │   │ subject                  │
                           │   │ body (HTML)              │
                           │   │ createdAt                │
                           │   │ readAt                   │
                           │   └──────────────────────────┘
                           │
                           │   ┌──────────────────────────┐
                           │   │    password_resets       │
                           │   ├──────────────────────────┤
                           │   │ id                  PK   │
                           │   │ email                    │
                           │   │ token                    │
                           │   │ createdAt                │
                           │   │ usedAt                   │
                           │   └──────────────────────────┘
```

No foreign-key constraints are declared in SQL — the relationships above are enforced only by application code (weakly).

## Tables

### `users`
| Column         | Type    | Notes                                                                          |
|----------------|---------|--------------------------------------------------------------------------------|
| `id`           | INTEGER | Primary key, auto-increment                                                    |
| `username`     | TEXT    | Unique, login handle                                                           |
| `email`        | TEXT    | Unique                                                                         |
| `passwordHash` | TEXT    | **MD5 hex digest** of the plaintext password (intentional crypto weakness)     |
| `role`         | TEXT    | One of `patient`, `doctor`, `receptionist`, `admin`                            |
| `fullName`     | TEXT    | Display name                                                                   |
| `dob`          | TEXT    | ISO date, patient only                                                         |
| `phone`        | TEXT    | E.164-ish                                                                      |
| `avatarUrl`    | TEXT    | Relative `/uploads/...` path, or absolute URL                                  |
| `departmentId` | INTEGER | FK → `departments.id` (doctors only)                                           |
| `bio`          | TEXT    | HTML allowed — rendered on doctor profile with `dangerouslySetInnerHTML`       |
| `banned`       | INTEGER | `0`/`1`. Added via lazy `ALTER TABLE` on first boot of the admin router        |
| `createdAt`    | TEXT    | Default `CURRENT_TIMESTAMP`                                                    |

Seed count: **50** (1 admin + 15 doctors + 33 patients + 1 receptionist).

### `departments`
| Column         | Type    | Notes                                      |
|----------------|---------|--------------------------------------------|
| `id`           | INTEGER | PK                                         |
| `name`         | TEXT    | Unique                                     |
| `description`  | TEXT    | One-line explanation                       |
| `headDoctorId` | INTEGER | FK → `users.id` (role=doctor)              |

Seed count: **6** (Cardiology, Internal Medicine, Dermatology, Pediatrics, Obstetrics, Radiology).

### `appointments`
| Column          | Type    | Notes                                                           |
|-----------------|---------|-----------------------------------------------------------------|
| `id`            | INTEGER | PK                                                              |
| `patientId`     | INTEGER | FK → `users.id`                                                 |
| `doctorId`      | INTEGER | FK → `users.id`                                                 |
| `departmentId`  | INTEGER | FK → `departments.id`                                           |
| `scheduledAt`   | TEXT    | ISO-ish datetime                                                |
| `status`        | TEXT    | `booked`, `checked_in`, `done`, `cancelled` (default `booked`)  |
| `reason`        | TEXT    | Free-text patient-supplied reason                               |
| `createdAt`     | TEXT    | Default `CURRENT_TIMESTAMP`                                     |

Seed count: **70**.

### `medical_records`
| Column           | Type    | Notes                                                                 |
|------------------|---------|-----------------------------------------------------------------------|
| `id`             | INTEGER | PK                                                                    |
| `patientId`      | INTEGER | FK → `users.id`                                                       |
| `doctorId`       | INTEGER | FK → `users.id`                                                       |
| `appointmentId`  | INTEGER | FK → `appointments.id` (nullable)                                     |
| `diagnosis`      | TEXT    | HTML allowed on read — stored-XSS sink                                |
| `prescription`   | TEXT    | HTML allowed on read                                                  |
| `notes`          | TEXT    | HTML allowed on read                                                  |
| `attachmentPath` | TEXT    | Relative path into `backend/uploads/`                                 |
| `createdAt`      | TEXT    | Default `CURRENT_TIMESTAMP`                                           |

Seed count: **37**. Sample records deliberately reference sensitive details (HIV status, mental health, substance abuse) to dramatise the impact of BOLA/IDOR leakage in `/api/records/:id`.

### `messages`
| Column       | Type    | Notes                                        |
|--------------|---------|----------------------------------------------|
| `id`         | INTEGER | PK                                           |
| `fromUserId` | INTEGER | FK → `users.id`                              |
| `toUserId`   | INTEGER | FK → `users.id`                              |
| `subject`    | TEXT    |                                              |
| `body`       | TEXT    | HTML allowed — rendered with `dangerouslySetInnerHTML` |
| `createdAt`  | TEXT    |                                              |
| `readAt`     | TEXT    | Null until the recipient opens the message   |

Seed count: **70**.

### `password_resets`
| Column      | Type    | Notes                                   |
|-------------|---------|-----------------------------------------|
| `id`        | INTEGER | PK                                      |
| `email`     | TEXT    | Target email                            |
| `token`     | TEXT    | `md5(email + Date.now())` (predictable) |
| `createdAt` | TEXT    |                                         |
| `usedAt`    | TEXT    | Null until the token is consumed        |

### `audit_log`
Created lazily by `backend/src/routes/admin.js` on first boot. Used by the safe admin routes (delete user, reset password, ban / unban). Seed count: **0**.

| Column          | Type    | Notes                                                |
|-----------------|---------|------------------------------------------------------|
| `id`            | INTEGER | PK                                                   |
| `actorId`       | INTEGER | `users.id` of the admin who performed the action     |
| `actorUsername` | TEXT    | Snapshot of actor's username                         |
| `action`        | TEXT    | e.g. `user.delete`, `user.reset-password`, `user.ban`|
| `targetType`    | TEXT    | e.g. `user`                                          |
| `targetId`      | INTEGER | `id` of the target entity                            |
| `details`       | TEXT    | JSON-encoded metadata                                |
| `ip`            | TEXT    | `req.ip`                                             |
| `createdAt`     | TEXT    | Default `CURRENT_TIMESTAMP`                          |

## Indexes

None. Seeds are small enough that full-table scans are acceptable for demo purposes.

## Reset procedure

```bash
rm backend/data/vulhealth.db
docker compose restart backend   # re-runs seed.sql on first connection
```

## Known design anti-patterns (deliberate)

| Anti-pattern                         | Where                              | Why kept                             |
|--------------------------------------|------------------------------------|--------------------------------------|
| MD5 password hashes                  | `users.passwordHash`               | Demonstrates A02 Cryptographic Failures |
| No FOREIGN KEY constraints           | Any FK column                      | Lets SQLi dump join-unrelated data   |
| HTML stored verbatim in user content | `users.bio`, records, messages     | Stored-XSS sinks                     |
| Predictable reset tokens             | `password_resets.token`            | Demonstrates A04 Insecure Design     |
| No audit log table                   | —                                  | A09 Security Logging Failures        |

See [`../06-security-notes.md`](../06-security-notes.md) for the full catalogue.
