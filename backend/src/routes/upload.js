const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { run } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// VULN: unrestricted file upload; filename is attacker-controlled (path traversal)
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', '..', 'uploads'),
    filename: (req, file, cb) => {
      const supplied = req.body.filename || file.originalname || 'file';
      cb(null, supplied);
    },
  }),
  // VULN: no fileFilter, no size cap
});

router.post('/avatar', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file required' });
    const served = '/uploads/' + path.basename(req.file.path);
    await run('UPDATE users SET avatarUrl = ? WHERE id = ?', [served, req.user.id]);
    res.json({
      message: 'uploaded',
      served,
      absolutePath: req.file.path, // VULN A05: leaks server filesystem path
    });
  } catch (e) { next(e); }
});

// VULN A01: arbitrary file read via path traversal
router.get('/file', (req, res) => {
  const name = req.query.name || '';
  if (!name) return res.status(400).json({ error: 'name required' });
  const full = path.join(__dirname, '..', '..', 'uploads', name);
  try {
    const contents = fs.readFileSync(full);
    res.send(contents);
  } catch (e) {
    res.status(404).json({ error: e.message, resolved: full });
  }
});

module.exports = router;
