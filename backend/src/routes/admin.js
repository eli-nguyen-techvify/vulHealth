const express = require('express');
const { exec } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const { get, all, run } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

// Lazy schema migrations for the safe admin features below
(async () => {
  try {
    await run('ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0');
  } catch (_) { /* column already exists */ }
  await run(`CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actorId INTEGER,
    actorUsername TEXT,
    action TEXT NOT NULL,
    targetType TEXT,
    targetId INTEGER,
    details TEXT,
    ip TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
})().catch((e) => console.error('[admin schema]', e));

const adminOnly = [requireAuth, requireRole('admin')];

function md5(s) { return crypto.createHash('md5').update(s).digest('hex'); }

function parseId(raw) {
  const n = parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parsePagination(q) {
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 50, 1), 200);
  const offset = Math.max(parseInt(q.offset, 10) || 0, 0);
  return { limit, offset };
}

async function audit(req, action, targetType, targetId, details) {
  try {
    await run(
      'INSERT INTO audit_log (actorId, actorUsername, action, targetType, targetId, details, ip) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        req.user?.id || null,
        req.user?.username || null,
        action,
        targetType || null,
        targetId || null,
        details ? JSON.stringify(details) : null,
        req.ip || null,
      ]
    );
  } catch (e) { console.error('[audit]', e); }
}

// VULN A01: user list lacks role check — just requireAuth.
router.get('/users', requireAuth, async (req, res, next) => {
  try {
    const rows = await all('SELECT id, username, email, role, fullName, phone, departmentId, passwordHash FROM users ORDER BY id');
    res.json(rows);
  } catch (e) { next(e); }
});

// VULN A03: Command injection via `host`
router.post('/ping', requireAuth, (req, res) => {
  const host = (req.body && req.body.host) || '';
  if (!host) return res.status(400).json({ error: 'host required' });
  // VULNERABLE: raw concatenation into shell
  exec(`ping -c 1 ${host}`, { timeout: 5000 }, (err, stdout, stderr) => {
    res.json({
      command: `ping -c 1 ${host}`,
      stdout: stdout || '',
      stderr: stderr || '',
      error: err ? err.message : null,
    });
  });
});

// VULN A03: Command injection via `filename`
router.post('/backup', requireAuth, requireRole('admin'), (req, res) => {
  const filename = (req.body && req.body.filename) || 'backup.db';
  const src = path.join(__dirname, '..', '..', 'data', 'vulhealth.db');
  const dest = path.join(__dirname, '..', '..', 'data', filename);
  // VULNERABLE: shell-executed with unsanitised filename
  exec(`cp "${src}" ${dest}`, (err, stdout, stderr) => {
    res.json({ command: `cp "${src}" ${dest}`, stderr, stdout, error: err?.message });
  });
});

// VULN A01: Path traversal — read arbitrary file under "logs"
router.get('/logs', requireAuth, (req, res) => {
  const file = req.query.file || 'app.log';
  // VULNERABLE: path.join with user-controlled file (no normalization guard)
  const full = path.join(__dirname, '..', '..', 'data', 'logs', file);
  try {
    const contents = fs.readFileSync(full, 'utf-8');
    res.type('text/plain').send(contents);
  } catch (e) {
    res.status(500).json({ error: e.message, resolved: full });
  }
});

const net = require('net');
const dns = require('dns').promises;

// Hosts allowed for the import/departments feature. Configurable via env.
const IMPORT_ALLOWED_HOSTS = (process.env.IMPORT_ALLOWED_HOSTS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function ipIsPrivate(ip) {
  if (!ip) return true;
  const v = net.isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  if (v === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA
    if (lower.startsWith('fe80')) return true; // link-local
    if (lower.startsWith('::ffff:')) return ipIsPrivate(lower.slice(7));
    return true; // be conservative for v6
  }
  return true;
}

router.post('/import/departments', adminOnly, async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url required' });
    }

    let parsed;
    try {
      parsed = new URL(url);
    } catch (_) {
      return res.status(400).json({ error: 'invalid url' });
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'only http/https urls are allowed' });
    }

    const host = parsed.hostname.toLowerCase();
    if (IMPORT_ALLOWED_HOSTS.length === 0 || !IMPORT_ALLOWED_HOSTS.includes(host)) {
      return res.status(403).json({ error: 'host not in allowlist' });
    }

    const records = await dns.lookup(host, { all: true });
    if (records.some((r) => ipIsPrivate(r.address))) {
      return res.status(400).json({ error: 'host resolves to a private/reserved address' });
    }

    const axios = require('axios');
    const r = await axios.get(parsed.toString(), {
      timeout: 5000,
      maxRedirects: 0,
      maxContentLength: 1_000_000,
      responseType: 'text',
      transformResponse: [(data) => data],
      validateStatus: (s) => s >= 200 && s < 300,
    });

    const preview = (typeof r.data === 'string' ? r.data : JSON.stringify(r.data)).slice(0, 5000);
    await audit(req, 'import.departments', 'url', null, { host });
    res.json({ status: r.status, preview });
  } catch (e) {
    res.status(502).json({ error: 'fetch failed' });
  }
});

// VULN A08 + A01: mass-assignment on user update, no role check enforced — anyone authenticated can promote themselves
router.put('/users/:id', requireAuth, async (req, res, next) => {
  try {
    const current = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!current) return res.status(404).json({ error: 'user not found' });
    const merged = _.merge({}, current, req.body);
    await run(
      `UPDATE users SET username=?, email=?, role=?, fullName=?, phone=?, departmentId=?, bio=? WHERE id=?`,
      [merged.username, merged.email, merged.role, merged.fullName, merged.phone, merged.departmentId, merged.bio, req.params.id]
    );
    res.json(merged);
  } catch (e) { next(e); }
});

// ====== Safe admin routes (newly added) ======
// All require admin role, use parameterized SQL, validate input, and write to audit_log.

// 1. Delete a user
router.delete('/users/:id', adminOnly, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    if (id === req.user.id) return res.status(400).json({ error: 'cannot delete yourself' });

    const target = await get('SELECT id, username, role FROM users WHERE id = ?', [id]);
    if (!target) return res.status(404).json({ error: 'user not found' });

    if (target.role === 'admin') {
      const row = await get("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'");
      if ((row?.n || 0) <= 1) {
        return res.status(400).json({ error: 'cannot delete the last admin' });
      }
    }

    await run('DELETE FROM users WHERE id = ?', [id]);
    await audit(req, 'user.delete', 'user', id, { username: target.username, role: target.role });
    res.json({ message: 'deleted', id });
  } catch (e) { next(e); }
});

// 2. List all appointments (system-wide, paginated)
router.get('/appointments', adminOnly, async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const status = typeof req.query.status === 'string' ? req.query.status : null;
    const allowed = ['booked', 'checked_in', 'done', 'cancelled'];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ error: 'invalid status' });
    }
    const where = status ? 'WHERE a.status = ?' : '';
    const listParams = status ? [status, limit, offset] : [limit, offset];
    const items = await all(
      `SELECT a.*, p.fullName AS patientName, d.fullName AS doctorName, dep.name AS departmentName
       FROM appointments a
       JOIN users p ON p.id = a.patientId
       JOIN users d ON d.id = a.doctorId
       LEFT JOIN departments dep ON dep.id = a.departmentId
       ${where}
       ORDER BY a.scheduledAt DESC
       LIMIT ? OFFSET ?`,
      listParams
    );
    const total = await get(
      `SELECT COUNT(*) AS n FROM appointments a ${where}`,
      status ? [status] : []
    );
    res.json({ total: total.n, limit, offset, items });
  } catch (e) { next(e); }
});

// 3. List all medical records (system-wide, paginated; no full HTML body to limit accidental exposure)
router.get('/records', adminOnly, async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const items = await all(
      `SELECT r.id, r.patientId, r.doctorId, r.appointmentId, r.diagnosis, r.createdAt,
              p.fullName AS patientName, d.fullName AS doctorName
       FROM medical_records r
       JOIN users p ON p.id = r.patientId
       JOIN users d ON d.id = r.doctorId
       ORDER BY r.createdAt DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const total = await get('SELECT COUNT(*) AS n FROM medical_records');
    res.json({ total: total.n, limit, offset, items });
  } catch (e) { next(e); }
});

// 4. Reset a user's password — admin generates a one-time temp password
router.post('/users/:id/reset-password', adminOnly, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });

    const target = await get('SELECT id, username FROM users WHERE id = ?', [id]);
    if (!target) return res.status(404).json({ error: 'user not found' });

    const tempPassword = crypto.randomBytes(12).toString('base64')
      .replace(/[+/=]/g, '')
      .slice(0, 16);
    await run('UPDATE users SET passwordHash = ? WHERE id = ?', [md5(tempPassword), id]);
    await audit(req, 'user.reset-password', 'user', id, { username: target.username });

    res.json({
      message: 'password reset; share securely and require user to change on next login',
      userId: id,
      username: target.username,
      tempPassword,
    });
  } catch (e) { next(e); }
});

// 5a. Ban a user
router.post('/users/:id/ban', adminOnly, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    if (id === req.user.id) return res.status(400).json({ error: 'cannot ban yourself' });

    const target = await get('SELECT id, username, banned FROM users WHERE id = ?', [id]);
    if (!target) return res.status(404).json({ error: 'user not found' });
    if (target.banned) return res.status(409).json({ error: 'user already banned' });

    await run('UPDATE users SET banned = 1 WHERE id = ?', [id]);
    await audit(req, 'user.ban', 'user', id, { username: target.username });
    res.json({ message: 'banned', id });
  } catch (e) { next(e); }
});

// 5b. Unban a user
router.post('/users/:id/unban', adminOnly, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });

    const target = await get('SELECT id, username, banned FROM users WHERE id = ?', [id]);
    if (!target) return res.status(404).json({ error: 'user not found' });
    if (!target.banned) return res.status(409).json({ error: 'user is not banned' });

    await run('UPDATE users SET banned = 0 WHERE id = ?', [id]);
    await audit(req, 'user.unban', 'user', id, { username: target.username });
    res.json({ message: 'unbanned', id });
  } catch (e) { next(e); }
});

// 6. System stats
router.get('/stats', adminOnly, async (req, res, next) => {
  try {
    const usersByRole = await all('SELECT role, COUNT(*) AS count FROM users GROUP BY role');
    const apptsByStatus = await all('SELECT status, COUNT(*) AS count FROM appointments GROUP BY status');
    const totalRecords = await get('SELECT COUNT(*) AS n FROM medical_records');
    const totalDepartments = await get('SELECT COUNT(*) AS n FROM departments');
    const bannedUsers = await get('SELECT COUNT(*) AS n FROM users WHERE banned = 1');
    res.json({
      usersByRole,
      appointmentsByStatus: apptsByStatus,
      totalRecords: totalRecords.n,
      totalDepartments: totalDepartments.n,
      bannedUsers: bannedUsers.n,
    });
  } catch (e) { next(e); }
});

// 7. Audit log
router.get('/audit-log', adminOnly, async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const items = await all(
      'SELECT * FROM audit_log ORDER BY id DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    const total = await get('SELECT COUNT(*) AS n FROM audit_log');
    res.json({ total: total.n, limit, offset, items });
  } catch (e) { next(e); }
});

module.exports = router;
