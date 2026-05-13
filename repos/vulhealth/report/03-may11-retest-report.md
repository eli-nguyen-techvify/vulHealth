# VulHealth — Retest Report (Round 2)

| | |
|---|---|
| Retest Date | 2026-05-11 |
| Retester | DevOps |
| Environment | Docker Compose, backend `http://localhost:3001`, frontend `http://localhost:4000` |
| Build | `vulhealth-backend:latest` (rebuilt 2026-05-11), `vulhealth-frontend:latest` (HMR / no rebuild needed) |
| Source Report | `repos/vulhealth/report/02-may11.md` |
| Findings Retested | 5 |
| Findings PASSED | 5 |
| Findings FAILED | 0 |

## Executive Summary

All 5 findings from the second-round report have been remediated. Every original PoC is now rejected with HTTP 4xx or a sanitized response (no shell execution, no internal data leak, no DOM script execution). The legitimate happy paths (admin ping for a clean host, avatar upload from a public image URL, sending/receiving messages, viewing doctor profiles) continue to function — no regressions observed.

A defense-in-depth side action was also performed: `JWT_SECRET` was rotated (the old value was exfiltrated via SSRF-VULN-001 RCE) and all attacker-deposited artifacts under `backend/uploads/` were removed.

| Finding ID | Title | Severity | First Round | Final Round |
|------------|-------|----------|-------------|-------------|
| XSS-VULN-001 | Stored XSS in Message Body — `<script>` Tag | Critical (8.7) | Open | **Closed — PASSED** |
| XSS-VULN-002 | Stored XSS in User Bio Field | High (7.5) | Open | **Closed — PASSED** |
| XSS-VULN-003 | Stored XSS via `img onerror` in Message Body | Critical (8.7) | Open | **Closed — PASSED** |
| SSRF-VULN-001 | Command Injection (RCE) via POST /api/admin/ping | Critical (9.9) | Open | **Closed — PASSED** |
| SSRF-VULN-002 | Partial SSRF via POST /api/users/me/avatar-from-url | Medium (6.5) | Open | **Closed — PASSED** |

## Remediation Claims (machine-readable)

| Vuln ID (prior run) | Vuln Type | Endpoint / Parameter | Title (prior report) | Fix Date | Fix Reference | DevOps Notes |
|---------------------|-----------|----------------------|----------------------|----------|---------------|--------------|
| XSS-VULN-001 | XSS-Stored | POST /api/messages (`body`) → GET /messages detail | Stored XSS in Message Body — `<script>` Tag | 2026-05-11 | frontend/src/pages/Messages.jsx | Replaced `<div dangerouslySetInnerHTML={{ __html: selected.body }} />` with `<div style={{whiteSpace:'pre-wrap'}}>{selected.body}</div>` — React performs default text escaping; line breaks preserved via CSS |
| XSS-VULN-002 | XSS-Stored | PUT /api/users/me (`bio`) → doctor profile / admin views | Stored XSS in User Bio Field (Admin Panel) | 2026-05-11 | frontend/src/pages/DoctorDetail.jsx | Replaced `<div dangerouslySetInnerHTML={{ __html: doc.bio || '<em>No bio.</em>' }} />` with text render `<div style={{whiteSpace:'pre-wrap'}}>{doc.bio || <em>No bio.</em>}</div>` — the only DOM sink that rendered raw bio HTML. Admin user table never rendered bio (text-only `<td>`); no other sinks needed changing |
| XSS-VULN-003 | XSS-Stored | POST /api/messages (`body`) → GET /messages detail | Stored XSS via `img onerror` in Message Body | 2026-05-11 | frontend/src/pages/Messages.jsx | Same fix as XSS-VULN-001 — text render closes both `<script>` and event-handler attribute vectors |
| SSRF-VULN-001 | Command Injection / RCE | POST /api/admin/ping (`host`) | POST /api/admin/ping — Command Injection (RCE) | 2026-05-11 | backend/src/routes/admin.js, .env | Replaced `exec(\`ping -c 1 ${host}\`)` with `execFile('ping', ['-c','1','-W','3', host], ...)` (no shell, argv-based); strict hostname regex `/^[a-zA-Z0-9][a-zA-Z0-9.-]{0,252}$/` validates `host` before exec; auth middleware upgraded from `requireAuth` to `adminOnly` (`requireAuth + requireRole('admin')`); response no longer echoes the command. **Side actions:** rotated `JWT_SECRET` (old value exfiltrated via RCE was forging tokens); removed 20 attacker-deposited artifacts from `backend/uploads/` (webshells `*.php`, `*.phar`, `*.phtml`, `*.php.jpg`, plus `passwd`, `hostname`, `stdin`, `xss.html`, `xxetest.xml`) |
| SSRF-VULN-002 | SSRF | POST /api/users/me/avatar-from-url (`url`) | Partial SSRF — POST /api/users/me/avatar-from-url | 2026-05-11 | backend/src/routes/users.js, backend/src/utils/net.js | `new URL()` validation; scheme allowlist (`http:`/`https:` only); DNS-resolves the host and blocks private/loopback/link-local/multicast/IPv6 ULA (shared util `ipIsPrivate` extracted to `utils/net.js`); axios `maxRedirects: 0`, `maxContentLength: 5MB`, `responseType: 'arraybuffer'`, `validateStatus: 2xx`; `Content-Type: image/*` validation; response no longer leaks `headers`, `body`, `stack`, or `e.message` — returns only `{message, status, contentType, size}` |

<!--
How to fill this table:
- "Vuln ID (prior run)": copy the ID from the previous round's final_report.md.
- "Vuln Type": closed vocabulary (e.g. SQLi, XSS-Stored, SSRF, Command Injection).
- "Endpoint / Parameter": method + path + parameter.
- "Fix Reference": file paths / commit hash / PR number.
- Drop empty rows before committing; empty rows still parse but add noise.
-->

---

### XSS-VULN-001: Stored XSS in Message Body — `<script>` Tag

| Field | Value |
|-------|-------|
| Finding ID | XSS-VULN-001 |
| Title | Stored XSS in Message Body — `<script>` Tag |
| Severity | Critical |
| CVSS v3.1 Vector | AV:N/AC:L/PR:L/UI:R/S:C/C:H/I:H/A:N |
| CVSS v3.1 Base Score | 8.7 |
| CWE | CWE-79: Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting') |
| OWASP WSTG | WSTG-INPV-02 (Testing for Stored Cross Site Scripting) |
| OWASP Top 10 (2021) | A03:2021 — Injection |
| Affected Endpoint(s) | POST /api/messages (`body`) → GET /messages detail |
| Status (First Round) | Open |
| Status (Final Round) | **Closed — PASSED** |

**Recommendation:**
- Avoid `dangerouslySetInnerHTML` for user-supplied content; use React's default text rendering or a strict sanitizer (e.g. DOMPurify).
- Treat message body as plain text — line breaks should be preserved via CSS `white-space: pre-wrap`, not via raw HTML.
- Reference: [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/OWASP_Cheat_Sheet_Series.html#cross-site-scripting-prevention)

**Retest Result (Final Round):**

- Date: 2026-05-11
- Result: **PASSED**
- Fix applied: `frontend/src/pages/Messages.jsx:62` replaced `<div dangerouslySetInnerHTML={{ __html: selected.body }} />` with `<div style={{ whiteSpace: 'pre-wrap' }}>{selected.body}</div>`. React's default escaping converts `<`, `>`, `&`, `"`, `'` to HTML entities — both `<script>` tags and event-handler attributes are now rendered as literal text and never enter the DOM as executable elements.
- Evidence:

  ```bash
  $ grep -n "dangerouslySetInnerHTML" frontend/src/pages/Messages.jsx
  (no match)
  ```

  Backend continues to accept and store raw HTML (intentional — the app is a training target; the fix is at the output/render layer). The stored payload is now rendered as the literal string in the DOM:

  ```text
  Browser: navigate to /messages, open a message with body
           "<img src=x onerror=alert('ONERROR_OK')><script>alert(document.domain)</script>"
  Result:  the literal string is displayed inside the card; no <img> or <script> nodes
           are created; window.alert is not invoked.
  ```

---

### XSS-VULN-002: Stored XSS in User Bio Field

| Field | Value |
|-------|-------|
| Finding ID | XSS-VULN-002 |
| Title | Stored XSS in User Bio Field (Admin Panel) |
| Severity | High |
| CVSS v3.1 Vector | AV:N/AC:L/PR:L/UI:R/S:C/C:H/I:L/A:N |
| CVSS v3.1 Base Score | 7.5 |
| CWE | CWE-79: Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting') |
| OWASP WSTG | WSTG-INPV-02 (Testing for Stored Cross Site Scripting) |
| OWASP Top 10 (2021) | A03:2021 — Injection |
| Affected Endpoint(s) | PUT /api/users/me (`bio`) → doctor profile / any profile detail view |
| Status (First Round) | Open (API-confirmed, browser exploitation blocked by lack of accessible sink during the session) |
| Status (Final Round) | **Closed — PASSED** |

**Recommendation:**
- Treat user-controlled bio as plain text; do not pass it through `dangerouslySetInnerHTML`.
- If basic formatting is required, sanitize with DOMPurify on output (allowlist `<br>`, `<em>`, `<strong>` only) — never trust the database value.
- Reference: [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/OWASP_Cheat_Sheet_Series.html#cross-site-scripting-prevention)

**Retest Result (Final Round):**

- Date: 2026-05-11
- Result: **PASSED**
- Fix applied: `frontend/src/pages/DoctorDetail.jsx:67` replaced `<div dangerouslySetInnerHTML={{ __html: doc.bio || '<em>No bio.</em>' }} />` with `<div style={{ whiteSpace: 'pre-wrap' }}>{doc.bio || <em>No bio.</em>}</div>`. The `<em>No bio.</em>` fallback is now JSX (statically authored, safe) — only the user-controlled string is rendered through React's text escaper. Source review confirmed `DoctorDetail.jsx` was the **only** UI sink that rendered `bio` as HTML; the admin user-management table (`/admin/users`) never rendered the bio column (text-only `<td>`s already escape), so no other change was required for the report's findings.
- Evidence:

  ```bash
  $ grep -rn "dangerouslySetInnerHTML.*bio" frontend/src
  (no match)
  ```

  Reproduction:
  ```text
  1. PUT /api/users/me with body {"bio":"<script>alert(\"BIO_XSS\")</script><img src=x onerror=alert(1)>"}
     → 200 OK, bio stored as raw HTML (intentional, training target)
  2. Browser: navigate to /doctors/<id> for the same user
     → The bio is displayed as the literal string; no <script>, no <img>, no alert.
  ```

- Note: Other pages in the codebase (`RecordDetail.jsx`, `doctor/PatientRecords.jsx`, `Search.jsx`) still call `dangerouslySetInnerHTML` for other fields. They were **not** in scope for the `02-may11` report and should be tracked under separate findings.

---

### XSS-VULN-003: Stored XSS via `img onerror` in Message Body

| Field | Value |
|-------|-------|
| Finding ID | XSS-VULN-003 |
| Title | Stored XSS via `img onerror` in Message Body |
| Severity | Critical |
| CVSS v3.1 Vector | AV:N/AC:L/PR:L/UI:R/S:C/C:H/I:H/A:N |
| CVSS v3.1 Base Score | 8.7 |
| CWE | CWE-79: Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting') |
| OWASP WSTG | WSTG-INPV-02 (Testing for Stored Cross Site Scripting) |
| OWASP Top 10 (2021) | A03:2021 — Injection |
| Affected Endpoint(s) | POST /api/messages (`body`) → GET /messages detail |
| Status (First Round) | Open (alert dialog `ONERROR_OK` fired in browser, msg id=84) |
| Status (Final Round) | **Closed — PASSED** |

**Recommendation:**
- Same root cause as XSS-VULN-001 (innerHTML rendering of attacker-controlled HTML); the single fix closes both vectors. Avoid `dangerouslySetInnerHTML` entirely for this field.
- Reference: [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/OWASP_Cheat_Sheet_Series.html#cross-site-scripting-prevention)

**Retest Result (Final Round):**

- Date: 2026-05-11
- Result: **PASSED**
- Fix applied: The same change to `frontend/src/pages/Messages.jsx:62` (see XSS-VULN-001) closes this vector — React text rendering escapes `<` so an `<img onerror=...>` tag is rendered as literal text and never instantiates an `<img>` element. The browser's image-load failure path (which triggered `onerror`) is no longer reachable.
- Evidence:

  ```text
  Browser: navigate to /messages with the prior msg id=84
           (body: "<img src=x onerror=alert('ONERROR_OK')>")
  Result:  Modal state: empty. No dialog fired.
           DOM probe: document.querySelectorAll('.card img,.card script') → []
           Inner text of the message card shows the literal payload string.
  ```

---

### SSRF-VULN-001: POST /api/admin/ping — Command Injection (RCE)

| Field | Value |
|-------|-------|
| Finding ID | SSRF-VULN-001 |
| Title | POST /api/admin/ping — Command Injection (RCE) |
| Severity | Critical |
| CVSS v3.1 Vector | AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:H |
| CVSS v3.1 Base Score | 9.9 |
| CWE | CWE-78: Improper Neutralization of Special Elements used in an OS Command ('OS Command Injection') |
| OWASP WSTG | WSTG-INPV-12 (Testing for Command Injection) |
| OWASP Top 10 (2021) | A03:2021 — Injection |
| Affected Endpoint(s) | POST /api/admin/ping (`host`) |
| Status (First Round) | Open — RCE confirmed as root (uid=0); JWT_SECRET exfiltrated; persistent webshells deployed |
| Status (Final Round) | **Closed — PASSED** |

**Recommendation:**
- Never pass user-controlled strings to a shell (`exec`, `system`, ``backtick``). Use `execFile` / `spawn` with the command and argv array separated — the OS does not interpret metacharacters in argv.
- Validate input against a strict allowlist (here: hostname charset).
- Authorization: a host-level diagnostic should be admin-only.
- Rotate any secrets that may have been exposed during the exploitable window; clean up any persistence artifacts.
- Reference: [OWASP Command Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/OWASP_Cheat_Sheet_Series.html#os-command-injection-defense)

**Retest Result (Final Round):**

- Date: 2026-05-11
- Result: **PASSED**
- Fix applied: `backend/src/routes/admin.js`
  - `exec(\`ping -c 1 ${host}\`, ...)` replaced with `execFile('ping', ['-c','1','-W','3', host], { timeout: 5000 }, ...)` — no shell involved; metacharacters in `host` would be passed literally to the `ping` binary, which rejects them.
  - Strict input validation: `host` must match `/^[a-zA-Z0-9][a-zA-Z0-9.-]{0,252}$/` (RFC 1123 hostname / IPv4 charset). Any string containing `;`, `|`, `&`, `` ` ``, `$`, space, etc. → 400 before exec.
  - Auth gate: `requireAuth` → `adminOnly` (`[requireAuth, requireRole('admin')]`).
  - Response sanitized: no longer echoes the constructed command; stdout/stderr capped at 4000/1000 bytes; error is generic `"ping failed"`.
- **Side actions** (operational cleanup tied to this RCE):
  - `.env`: `JWT_SECRET` rotated to a fresh 96-hex (48 random bytes). The old value `997c1452203f...` was extracted via RCE and could forge any user's JWT — the new secret invalidates every pre-rotation token (all clients must log in again).
  - `backend/uploads/`: 20 attacker-deposited files removed — `admin_shell.php`, `alice_exec.php`, `alice_exploit_shell.php`, `alice_rce.php`, `alice_shell.php`, `alice_shell2.php`, `pwned_shell.php`, `shell.php`, `shell.php.jpg`, `shell2.php`, `test.phar`, `test.php`, `test.php.jpg`, `test.phtml`, `xss.html`, `xxetest.xml`, `test.xml`, plus RCE byproducts (`passwd`, `hostname`, `stdin`). Only `.gitkeep` and two benign test artifacts (`dr_smith_test.txt`, `fake_avatar.txt`) remain.
- Evidence:

  | Test case | Payload | Before fix | After fix |
  |-----------|---------|------------|-----------|
  | TC-1 Non-admin | patient token + `{"host":"127.0.0.1; id"}` | 200, `uid=0(root)` | **403** `{"error":"Forbidden","requiredRoles":["admin"]}` |
  | TC-2 Admin + `;` | admin token + `{"host":"127.0.0.1; id"}` | 200, `uid=0(root)` | **400** `{"error":"invalid host"}` |
  | TC-3 Admin + `\|` | admin token + `{"host":"127.0.0.1\|cat /etc/passwd"}` | 200, passwd dump | **400** `{"error":"invalid host"}` |
  | TC-4 Admin + backtick | admin token + ``{"host":"127.0.0.1`id`"}`` | 200, RCE | **400** `{"error":"invalid host"}` |
  | TC-5 Admin + clean host (sanity) | admin token + `{"host":"127.0.0.1"}` | 200 + command echo | **200** `{"host":"127.0.0.1","stdout":"PING 127.0.0.1 ...","stderr":"","error":null}` — no command echo |
  | TC-6 Forged JWT (old secret) | token signed with `997c1452...` | 200 (would still verify) | **401** `{"error":"Unauthorized"}` — secret rotated |

---

### SSRF-VULN-002: POST /api/users/me/avatar-from-url — SSRF

| Field | Value |
|-------|-------|
| Finding ID | SSRF-VULN-002 |
| Title | Partial SSRF — POST /api/users/me/avatar-from-url |
| Severity | Medium |
| CVSS v3.1 Vector | AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:N |
| CVSS v3.1 Base Score | 6.5 |
| CWE | CWE-918: Server-Side Request Forgery |
| OWASP WSTG | WSTG-INPV-19 (Testing for SSRF) |
| OWASP Top 10 (2021) | A10:2021 — Server-Side Request Forgery |
| Affected Endpoint(s) | POST /api/users/me/avatar-from-url (`url`) |
| Status (First Round) | Open — internal HTTP enumeration confirmed (`127.0.0.1`, `host.docker.internal`); file:// blocked at axios layer, no RCE; full response body leaked in JSON |
| Status (Final Round) | **Closed — PASSED** |

**Recommendation:**
- Parse the URL server-side; reject anything that is not `http:` or `https:`.
- Resolve the hostname via DNS and reject responses whose addresses fall in private/loopback/link-local/multicast/CGNAT/IPv6-ULA ranges (and reject 169.254.169.254 metadata explicitly).
- Disable redirects (`maxRedirects: 0`) — otherwise an HTTP 302 to a private IP bypasses the pre-flight check.
- Validate the response `Content-Type` (here: `image/*`) before consuming the body.
- Never echo the upstream response body, headers, or error stack to the client — that turns even GET-only SSRF into an info-disclosure primitive.
- Reference: [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/OWASP_Cheat_Sheet_Series.html#server-side-request-forgery-prevention)

**Retest Result (Final Round):**

- Date: 2026-05-11
- Result: **PASSED**
- Fix applied: `backend/src/routes/users.js` (handler `POST /me/avatar-from-url`) + new shared util `backend/src/utils/net.js` (`ipIsPrivate`)
  - URL parsed via `new URL()`; protocol must be `http:` or `https:`.
  - `dns.lookup(host, { all: true })` resolves every A/AAAA record; if **any** address is private/loopback/link-local/multicast/IPv6-ULA, request is rejected with 400.
  - axios call hardened: `maxRedirects: 0`, `maxContentLength: 5 MB`, `responseType: 'arraybuffer'`, `validateStatus: s => s >= 200 && s < 300`.
  - Response `Content-Type` checked against `image/*`; non-image responses → 400.
  - Response payload reduced to `{message, status, contentType, size}` — no `headers`, no `body`, no `e.message`, no `e.stack`. Error path returns the generic string `"fetch failed"` with 502.
- Evidence:

  | Test case | Payload | Before fix | After fix |
  |-----------|---------|------------|-----------|
  | TC-1 Loopback enumeration | `{"url":"http://127.0.0.1:3001/"}` | 200, leaked internal API JSON in `body` | **400** `{"error":"host resolves to a private/reserved address"}` |
  | TC-2 Cloud metadata | `{"url":"http://169.254.169.254/"}` | (infra-dependent) leak | **400** `{"error":"host resolves to a private/reserved address"}` |
  | TC-3 Host alias cross-network | `{"url":"http://host.docker.internal:3001/api/doctors"}` | 200, leaked doctor list | **400** `{"error":"host resolves to a private/reserved address"}` (resolves to the docker bridge address) |
  | TC-4 `file://` scheme | `{"url":"file:///etc/passwd"}` | 502 with `ERR_ASSERTION` + full stack trace | **400** `{"error":"only http/https urls are allowed"}` |
  | TC-5 Non-image upstream | `{"url":"https://example.com/"}` | 200 with full HTML body | **400** `{"error":"response is not an image"}` |
  | TC-6 Malformed URL | `{"url":"not a url"}` | 502 with stack trace | **400** `{"error":"invalid url"}` |

---

## Sign-off

| Role | Name | Status |
|------|------|--------|
| DevOps Fix Owner | shaun.tran@techvify.com.vn | Fix complete, retest PASSED 2026-05-11 |
| Pentest Team | _TBD_ | Awaiting independent verification |
| Engineering Lead | _TBD_ | Awaiting approval to merge |

**Recommendation for go-live:**
1. Confirm `JWT_SECRET` was rotated in every environment (dev/staging/prod). Audit who held a copy of the prior secret `997c1452203f...` since it was exfiltrated; treat any pre-rotation JWT as potentially forged.
2. Pentest team to re-run the full DAST suite — including the message-body and bio fields with fresh payloads — to confirm no XSS regression and no new bypass for `/admin/ping` or `/me/avatar-from-url`.
3. Track out-of-scope findings under separate tickets:
   - Remaining `dangerouslySetInnerHTML` sinks in `RecordDetail.jsx`, `doctor/PatientRecords.jsx`, `Search.jsx`.
   - Other admin-side command injections still present in `POST /api/admin/backup` (`filename`).
   - Path traversal on `GET /api/admin/logs` (`file`).
   - Mass assignment on `PUT /api/admin/users/:id` and `PUT /api/users/me` (lodash `_.merge` with user input).
   - Verbose error handler in `backend/src/index.js` still returns `err.stack` to clients.
   - JWT stored in `localStorage` on the frontend — XSS is now mitigated, but moving the token to an `httpOnly` cookie would raise the bar against any future XSS regression.
4. Add static checks (ESLint `react/no-danger`, Semgrep rules for `child_process.exec` with template literals) to CI so the patterns fixed here don't reappear.
