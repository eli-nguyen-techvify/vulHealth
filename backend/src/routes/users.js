const express = require('express');
const axios = require('axios');
const _ = require('lodash');
const { get, run, all } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const u = await get('SELECT id, username, email, role, fullName, dob, phone, avatarUrl, departmentId, bio FROM users WHERE id = ?', [req.user.id]);
    res.json(u);
  } catch (e) { next(e); }
});

// VULN A08: mass assignment — merges req.body without filtering
// Send { "role": "admin" } to escalate.
router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const current = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!current) return res.status(404).json({ error: 'user not found' });
    // VULNERABLE: lodash.merge with user-controlled input
    const merged = _.merge({}, current, req.body);
    await run(
      `UPDATE users SET username=?, email=?, role=?, fullName=?, dob=?, phone=?, avatarUrl=?, bio=?, departmentId=? WHERE id=?`,
      [merged.username, merged.email, merged.role, merged.fullName, merged.dob, merged.phone, merged.avatarUrl, merged.bio, merged.departmentId, req.user.id]
    );
    const updated = await get('SELECT id, username, email, role, fullName, phone, avatarUrl, bio, departmentId FROM users WHERE id = ?', [req.user.id]);
    res.json(updated);
  } catch (e) { next(e); }
});

// VULN A10: SSRF — fetches raw URL supplied by user
router.post('/me/avatar-from-url', requireAuth, async (req, res, next) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'url required' });
    // VULNERABLE: no URL allowlist, no scheme/IP filter → can hit 169.254.169.254, localhost, internal services
    const r = await axios.get(url, { timeout: 5000, maxRedirects: 5, responseType: 'text' });
    // Leak the fetched content in the response — makes SSRF trivially exploitable
    res.json({
      message: 'Avatar fetched',
      url,
      status: r.status,
      headers: r.headers,
      body: typeof r.data === 'string' ? r.data.slice(0, 10000) : r.data,
    });
  } catch (e) {
    // leak error info too
    res.status(502).json({ error: e.message, code: e.code, stack: e.stack });
  }
});

// VULN A01: any authenticated user can view any user's profile (slightly weaker IDOR — may or may not be a finding depending on definition)
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const u = await get('SELECT id, username, email, role, fullName, phone, avatarUrl, departmentId, bio FROM users WHERE id = ?', [req.params.id]);
    if (!u) return res.status(404).json({ error: 'not found' });
    res.json(u);
  } catch (e) { next(e); }
});

// Change password — no old password required! (VULN A07 broken auth)
router.post('/me/change-password', requireAuth, async (req, res, next) => {
  try {
    const crypto = require('crypto');
    const { newPassword } = req.body || {};
    if (!newPassword) return res.status(400).json({ error: 'newPassword required' });
    const hash = crypto.createHash('md5').update(newPassword).digest('hex');
    await run('UPDATE users SET passwordHash = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ message: 'password changed' });
  } catch (e) { next(e); }
});

module.exports = router;
