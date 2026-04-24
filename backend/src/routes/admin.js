const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const { get, all, run } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

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

// VULN A10: SSRF — admin imports departments from external URL
router.post('/import/departments', requireAuth, async (req, res, next) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'url required' });
    const axios = require('axios');
    const r = await axios.get(url, { timeout: 5000 });
    res.json({ status: r.status, preview: (typeof r.data === 'string' ? r.data : JSON.stringify(r.data)).slice(0, 5000) });
  } catch (e) {
    res.status(502).json({ error: e.message, code: e.code });
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

module.exports = router;
