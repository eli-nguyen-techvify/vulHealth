const express = require('express');
const axios = require('axios');
const dns = require('dns').promises;
const _ = require('lodash');
const { get, run, all } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { ipIsPrivate } = require('../utils/net');

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

router.post('/me/avatar-from-url', requireAuth, async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url required' });
    }

    let parsed;
    try { parsed = new URL(url); } catch (_) {
      return res.status(400).json({ error: 'invalid url' });
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'only http/https urls are allowed' });
    }

    const records = await dns.lookup(parsed.hostname, { all: true });
    if (records.length === 0 || records.some((r) => ipIsPrivate(r.address))) {
      return res.status(400).json({ error: 'host resolves to a private/reserved address' });
    }

    const r = await axios.get(parsed.toString(), {
      timeout: 5000,
      maxRedirects: 0,
      maxContentLength: 5 * 1024 * 1024,
      responseType: 'arraybuffer',
      validateStatus: (s) => s >= 200 && s < 300,
    });

    const contentType = String(r.headers['content-type'] || '').toLowerCase();
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'response is not an image' });
    }

    res.json({
      message: 'Avatar fetched',
      status: r.status,
      contentType,
      size: r.data?.byteLength || 0,
    });
  } catch (_) {
    res.status(502).json({ error: 'fetch failed' });
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
