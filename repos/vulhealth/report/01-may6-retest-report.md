# VulHealth — Retest Report (Final Round)

| | |
|---|---|
| Retest Date | 2026-05-06 |
| Retester | DevOps |
| Environment | Docker Compose, backend `http://localhost:3001`, frontend `http://localhost:4000` |
| Build | `vulhealth-backend:latest`, `vulhealth-frontend:latest` (rebuilt 2026-05-06) |
| Source Report | `repos/vulhealth/report/00-may6.md` |
| Findings Retested | 5 |
| Findings PASSED | 5 |
| Findings FAILED | 0 |

## Executive Summary

All 5 findings from the first-round report have been successfully remediated. Every original exploitation step (PoC) is now rejected with HTTP 4xx + a generic error message. Legitimate functional flows (admin login, valid admin endpoints) continue to operate as expected — no regressions observed.

| Finding ID | Title | Severity | First Round | Final Round |
|------------|-------|----------|-------------|-------------|
| INJ-VULN-004 | SQL Injection — Auth Bypass (POST /api/auth/login) | Critical (9.8) | Open | **Closed — PASSED** |
| XSS-VULN-001 | DOM-based XSS on Landing Page `?q=` | High (8.1) | Open | **Closed — PASSED** |
| AUTH-VULN-001 | JWT Forgery via Hardcoded HS256 Secret "secret" | Critical (9.1) | Open | **Closed — PASSED** |
| AUTH-VULN-002 | Authentication Bypass via alg:none JWT | Critical (9.8) | Open | **Closed — PASSED** |
| AUTHZ-VULN-014 | SSRF via import/departments | Medium (8.1) | Open | **Closed — PASSED** |

## Remediation Claims (machine-readable)

The table below follows the canonical schema consumed by Shannon's `report` agent (`prompts/shared/_remediation-verification.txt`). Drop a copy of this table — or the whole file — into `repos/<project>/remediation/` so the next pipeline run cross-checks every claim against current findings and re-probes orphans.

| Vuln ID (prior run) | Vuln Type | Endpoint / Parameter | Title (prior report) | Fix Date | Fix Reference | DevOps Notes |
|---------------------|-----------|----------------------|----------------------|----------|---------------|--------------|
| INJ-VULN-004 | SQLi | POST /api/auth/login (`username`) | SQL Injection — Auth Bypass | 2026-05-06 | backend/src/routes/auth.js (parameterized query) | Refactored to prepared statement (`?` placeholder); removed username-enumeration branch; consolidated to generic `Invalid username or password` response; cookie set `httpOnly` + `secure` (production) |
| XSS-VULN-001 | XSS-DOM | GET / (`q`) | DOM-based XSS on Landing Page `?q=` Parameter | 2026-05-06 | frontend/src/pages/Landing.jsx | Replaced `dangerouslySetInnerHTML` with React default escaping (`<span>{q}</span>`); session-token cookie also moved to `httpOnly` |
| AUTH-VULN-001 | Auth Bypass | All JWT-protected endpoints (Authorization header) | JWT Forgery via Hardcoded HS256 Secret "secret" | 2026-05-06 | backend/src/jwt.js, docker-compose.yml, .env | Removed hard-coded default `'secret'`; module throws on require when `JWT_SECRET` is empty / weak preset / shorter than 32 chars; rotated secret to 96 hex chars (48 random bytes); compose now fail-fast on missing env |
| AUTH-VULN-002 | Auth Bypass | All JWT-protected endpoints (Authorization header) | Authentication Bypass via alg:none JWT | 2026-05-06 | backend/src/jwt.js | Pinned `alg = 'HS256'` server-side; rejects `none/HS512/RS256/...`; validates `typ === 'JWT'`; rejects tokens with empty signature; HMAC verified via `crypto.timingSafeEqual` before payload parse |
| AUTHZ-VULN-014 | SSRF | POST /api/admin/import/departments (`url`) | SSRF via import/departments (XXE potential) | 2026-05-06 | backend/src/routes/admin.js | `adminOnly` middleware; `new URL()` validation (http/https only); host allowlist via `IMPORT_ALLOWED_HOSTS` env (fail-secure default); DNS-blocks private/loopback/link-local/multicast/IPv6 ULA; axios `maxRedirects: 0`, `maxContentLength: 1MB`; generic error + `audit_log` per call |

<!--
How to fill this table:
- "Vuln ID (prior run)": copy the ID from the previous round's final_report.md (e.g. INJ-VULN-004).
- "Vuln Type": use the closed vocabulary defined in _remediation-verification.txt (e.g. SQLi, XSS-Reflected, IDOR).
- "Endpoint / Parameter": method + path + parameter (e.g. POST /api/auth/login (`username`)).
- "Fix Reference": commit hash, PR number, or Jira ticket — anything traceable in code/repo.
- Drop empty rows before committing; empty rows still parse but add noise.
-->

---

### INJ-VULN-004: SQL Injection — Auth Bypass (POST /api/auth/login)

| Field | Value |
|-------|-------|
| Finding ID | INJ-VULN-004 |
| Title | SQL Injection — Auth Bypass (POST /api/auth/login) |
| Severity | Critical |
| CVSS v3.1 Vector | AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H |
| CVSS v3.1 Base Score | 9.8 |
| CWE | CWE-89: Improper Neutralization of Special Elements used in an SQL Command ('SQL Injection') |
| OWASP WSTG | WSTG-INPV-05 (Testing for SQL Injection) |
| OWASP Top 10 (2021) | A03:2021 — Injection |
| Affected Endpoint(s) | POST /api/auth/login |
| Status (First Round) | Open |
| Status (Final Round) | **Closed — PASSED** |

**Recommendation:**

- Use parameterized queries (prepared statements) for all SQL queries; never interpolate user input directly into SQL strings.
- Reference: [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/OWASP_Cheat_Sheet_Series.html#sql-injection-prevention)

**Retest Result (Final Round):**

- Date: 2026-05-06
- Result: **PASSED**
- Fix applied: `backend/src/routes/auth.js` was refactored to use a prepared statement (`?` placeholder), removed the branch that enumerated existing usernames, and consolidated the response into the generic message `Invalid username or password`. The session cookie is now set with `httpOnly: true` + `secure` (production).
- Evidence:

  ```bash
  $ curl -s -X POST http://localhost:3001/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"username":"admin'\''--","password":"anypassword"}'
  {"error":"Invalid username or password"}
  HTTP/1.1 401 Unauthorized
  ```text
  Sanity (legit login):
  ```bash
  $ curl -s -X POST http://localhost:3001/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"username":"admin","password":"admin123"}'
  {"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...","user":{"id":1,"role":"admin",...}}
  HTTP/1.1 200 OK
  ```

---

### XSS-VULN-001: DOM-based XSS on Landing Page `?q=` Parameter

| Field | Value |
|-------|-------|
| Finding ID | XSS-VULN-001 |
| Title | DOM-based XSS on Landing Page `?q=` Parameter |
| Severity | High |
| CVSS v3.1 Vector | AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N |
| CVSS v3.1 Base Score | 8.1 |
| CWE | CWE-79: Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting') |
| OWASP WSTG | WSTG-CLNT-01 (Testing for DOM-Based Cross-Site Scripting) |
| OWASP Top 10 (2021) | A03:2021 — Injection |
| Affected Endpoint(s) | GET /?q= (Landing page, http://localhost:4000/) |
| Status (First Round) | Open |
| Status (Final Round) | **Closed — PASSED** |

**Recommendation:**
- Avoid `dangerouslySetInnerHTML` for user-supplied content; use React's default escaping or a safe sanitization library (e.g., DOMPurify).
- Reference: [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/OWASP_Cheat_Sheet_Series.html#cross-site-scripting-prevention)

**Retest Result (Final Round):**

- Date: 2026-05-06
- Result: **PASSED**
- Fix applied: `frontend/src/pages/Landing.jsx` replaced `<span dangerouslySetInnerHTML={{ __html: q }} />` with `<span>{q}</span>` so React performs default escaping. The session token cookie has also been set to `httpOnly: true` (see fix INJ-VULN-004) to mitigate the impact of any other XSS sinks.
- Evidence:

  ```bash
  $ grep -n "dangerouslySetInnerHTML" frontend/src/pages/Landing.jsx
  (no match)

  $ curl -s "http://localhost:4000/src/pages/Landing.jsx" | grep -c "dangerouslySetInnerHTML"
  0
  ```

  Browser test: navigating to `http://localhost:4000/?q=<img src=x onerror=alert(1)>` → the payload is rendered as the literal text `<img src=x onerror=alert(1)>`, with no auxiliary network requests and no `alert` triggered.
- Note: Other pages (`Search.jsx`, `DoctorDetail.jsx`, `Messages.jsx`, `RecordDetail.jsx`, `doctor/PatientRecords.jsx`) still use `dangerouslySetInnerHTML` — out of scope for this finding, but should be tracked under separate findings.

---

### AUTH-VULN-001: JWT Forgery via Hardcoded HS256 Secret "secret"

| Field | Value |
|-------|-------|
| Finding ID | AUTH-VULN-001 |
| Title | JWT Forgery via Hardcoded HS256 Secret "secret" |
| Severity | Critical |
| CVSS v3.1 Vector | AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H |
| CVSS v3.1 Base Score | 9.1 |
| CWE | CWE-287: Improper Authentication |
| OWASP WSTG | WSTG-ATHN-04 (Testing for JWT) |
| OWASP Top 10 (2021) | A07:2021 — Identification and Authentication Failures |
| Affected Endpoint(s) | All JWT-protected endpoints |
| Status (First Round) | Open |
| Status (Final Round) | **Closed — PASSED** |

**Recommendation:**

- Rotate `JWT_SECRET` immediately; use a cryptographically random, environment-specific secret (minimum 256 bits).
- Implement a token allowlist or denylist to support server-side revocation.
- Reference: [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/OWASP_Cheat_Sheet_Series.html#session-management)

**Retest Result (Final Round):**

- Date: 2026-05-06
- Result: **PASSED**
- Fix applied:
  - `backend/src/jwt.js`: removed the hard-coded default `'secret'`; the module now throws on require if `JWT_SECRET` is empty / a weak preset (`secret`, `changeme`, `password`) / shorter than 32 characters.
  - `docker-compose.yml`: `JWT_SECRET=${JWT_SECRET:?...}` — requires the value to be set via `.env` or shell env, fails fast otherwise.
  - `.env` (gitignored) + `.env.example`: rotated the secret to 96 hex chars (48 random bytes).
- Evidence (using a forged token signed with the old key `'secret'`):

  ```bash
  $ FORGED=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdnVsaGVhbHRoLmxvY2FsIn0.DPk4QDMhSwQLRjzENVlDVY00Xuljai1vKS1WeIM7LLg

  $ curl -s -o /dev/null -w "%{http_code}\n" \
      http://localhost:3001/api/admin/users \
      -H "Authorization: Bearer $FORGED"
  401

  $ curl -s -X POST http://localhost:3001/api/admin/ping \
      -H "Authorization: Bearer $FORGED" \
      -H "Content-Type: application/json" -d '{"host":"example.com"}'
  {"error":"Unauthorized"}
  HTTP/1.1 401 Unauthorized
  ```

  Boot-time guard verified:
  ```
  JWT_SECRET=secret  → process throws: "JWT_SECRET must be set to a strong, unique value (>= 32 chars)..."
  JWT_SECRET unset   → process throws: same message
  ```

---

### AUTH-VULN-002: Authentication Bypass via alg:none JWT

| Field | Value |
|-------|-------|
| Finding ID | AUTH-VULN-002 |
| Title | Authentication Bypass via alg:none JWT |
| Severity | Critical |
| CVSS v3.1 Vector | AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H |
| CVSS v3.1 Base Score | 9.8 |
| CWE | CWE-287: Improper Authentication |
| OWASP WSTG | WSTG-ATHN-04 (Testing for JWT) |
| OWASP Top 10 (2021) | A07:2021 — Identification and Authentication Failures |
| Affected Endpoint(s) | All JWT-protected endpoints |
| Status (First Round) | Open |
| Status (Final Round) | **Closed — PASSED** |

**Recommendation:**
- Explicitly specify and validate the expected algorithm server-side; do not accept `alg=none`.
- Pin the algorithm to HS256 (or RS256) and reject any mismatched header.
- Reference: [CVE-2018-0114 — jwt library algorithm confusion](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2018-0114)

**Retest Result (Final Round):**
- Date: 2026-05-06
- Result: **PASSED**
- Fix applied: `backend/src/jwt.js` strictly pins `alg = 'HS256'` on the server side; rejects every other `alg` value (`none/None/NONE/HS512/RS256/...`); validates `typ === 'JWT'`; rejects tokens with an empty signature segment; and verifies the HMAC with `crypto.timingSafeEqual` **before** parsing the payload.
- Evidence (unsigned alg:none token):
  ```bash
  $ UNSIGNED=eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdnVsaGVhbHRoLmxvY2FsIn0.

  $ curl -s -X GET http://localhost:3001/api/admin/users \
      -H "Authorization: Bearer $UNSIGNED"
  {"error":"Unauthorized"}
  HTTP/1.1 401 Unauthorized

  $ curl -s -X POST http://localhost:3001/api/admin/ping \
      -H "Authorization: Bearer $UNSIGNED" \
      -H "Content-Type: application/json" -d '{"host":"8.8.8.8"}'
  {"error":"Unauthorized"}
  HTTP/1.1 401 Unauthorized
  ```
  Unit test runtime:
  ```
  valid token verifies:        true
  alg:none rejected:           true
  tampered signature rejected: true
  alg:HS512 rejected:          true
  ```

---

### AUTHZ-VULN-014: SSRF via import/departments (XXE potential)

| Field | Value |
|-------|-------|
| Finding ID | AUTHZ-VULN-014 |
| Title | SSRF via import/departments (XXE potential) |
| Severity | Medium |
| CVSS v3.1 Vector | AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N |
| CVSS v3.1 Base Score | 8.1 |
| CWE | CWE-918: Server-Side Request Forgery |
| OWASP WSTG | WSTG-INPV-19 (Testing for SSRF) |
| OWASP Top 10 (2021) | A10:2021 — Server-Side Request Forgery |
| Affected Endpoint(s) | POST /api/admin/import/departments |
| Status (First Round) | Open |
| Status (Final Round) | **Closed — PASSED** |

**Recommendation:**
- Validate URL input against an allowlist; block private IP ranges and `file://` scheme.
- If XML is processed, disable external entity expansion; use a secure XML parser configuration.
- Reference: [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/OWASP_Cheat_Sheet_Series.html#server-side-request-forgery-prevention)

**Retest Result (Final Round):**
- Date: 2026-05-06
- Result: **PASSED**
- Fix applied: `backend/src/routes/admin.js`
  - Switched the middleware from `requireAuth` to `adminOnly` (`requireAuth + requireRole('admin')`).
  - URL validation via `new URL()`; only `http:` / `https:` schemes are accepted.
  - Host allowlist read from env `IMPORT_ALLOWED_HOSTS` (CSV). Empty default → fail-secure (403).
  - DNS-resolves the host and blocks private/loopback/link-local/multicast/IPv6 ULA addresses.
  - `axios` config: `maxRedirects: 0`, `maxContentLength: 1MB`, `validateStatus: 2xx`.
  - Generic error response; every call is written to `audit_log`.
- Evidence:
  | Test case | Payload | Before fix | After fix |
  |-----------|---------|------------|-----------|
  | TC-1 External, no allowlist | `{"url":"https://example.com"}` (admin) | 200 (fetch external) | **403** `{"error":"host not in allowlist"}` |
  | TC-2 Loopback SSRF | `{"url":"http://127.0.0.1:3001/api/admin/users"}` | 200 (leak users) | **403** |
  | TC-3 Cloud metadata | `{"url":"http://169.254.169.254/latest/meta-data/"}` | infra-dependent leak | **403** |
  | TC-4 file:// scheme | `{"url":"file:///etc/passwd"}` | 502 / read file | **400** `{"error":"only http/https urls are allowed"}` |
  | TC-5 Non-admin user | role=patient + `{"url":"https://example.com"}` | 200 (only requires authenticated) | **403** `{"error":"Forbidden","requiredRoles":["admin"]}` |

---

## Sign-off

| Role | Name | Status |
|------|------|--------|
| DevOps Fix Owner | shaun.tran@techvify.com.vn | Fix complete, retest PASSED 2026-05-06 |
| Pentest Team | _TBD_ | Awaiting independent verification |
| Engineering Lead | _TBD_ | Awaiting approval to merge |

**Recommendation for go-live:**
1. Rotate `JWT_SECRET` for each environment (dev/staging/prod) using `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` and store the value in a vault. Never commit a real `.env`.
2. Set `IMPORT_ALLOWED_HOSTS` per environment (CSV); the endpoint returns 403 if it is not configured.
3. Pentest team to re-run the full scanner to confirm no regressions or new bypasses.
4. Track out-of-scope findings (XSS sinks on other pages, command injection on `/admin/ping` and `/admin/backup`, path traversal on `/admin/logs`, mass assignment on `PUT /admin/users/:id`, weak reset token in forgot-password) under separate tickets.
