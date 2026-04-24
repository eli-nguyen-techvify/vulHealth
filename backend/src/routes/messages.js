const express = require('express');
const { get, all, run } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// VULN: Stored XSS — body is raw HTML, frontend renders it via dangerouslySetInnerHTML
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { toUserId, subject, body } = req.body || {};
    if (!toUserId || !body) return res.status(400).json({ error: 'toUserId and body required' });
    const r = await run(
      'INSERT INTO messages (fromUserId, toUserId, subject, body) VALUES (?, ?, ?, ?)',
      [req.user.id, toUserId, subject || '', body]
    );
    res.json({ id: r.lastID });
  } catch (e) { next(e); }
});

router.get('/inbox', requireAuth, async (req, res, next) => {
  try {
    const rows = await all(
      `SELECT m.*, u.fullName AS fromName, u.username AS fromUsername
       FROM messages m
       JOIN users u ON u.id = m.fromUserId
       WHERE m.toUserId = ? ORDER BY m.createdAt DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/sent', requireAuth, async (req, res, next) => {
  try {
    const rows = await all(
      `SELECT m.*, u.fullName AS toName, u.username AS toUsername
       FROM messages m
       JOIN users u ON u.id = m.toUserId
       WHERE m.fromUserId = ? ORDER BY m.createdAt DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// VULN A01: no ownership check
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const m = await get(
      `SELECT m.*, f.fullName AS fromName, t.fullName AS toName FROM messages m
       JOIN users f ON f.id = m.fromUserId
       JOIN users t ON t.id = m.toUserId
       WHERE m.id = ?`,
      [req.params.id]
    );
    if (!m) return res.status(404).json({ error: 'not found' });
    res.json(m);
  } catch (e) { next(e); }
});

module.exports = router;
