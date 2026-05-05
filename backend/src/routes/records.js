const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { get, all, run } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Doctor writes a new medical record
router.post('/', requireAuth, async (req, res, next) => {
  try {
    // VULN A01: no role check — any authenticated user (e.g., patient) can create a record.
    const { patientId, doctorId, appointmentId, diagnosis, prescription, notes } = req.body || {};
    if (!patientId) return res.status(400).json({ error: 'patientId required' });
    // VULN: diagnosis/notes are stored as-is and later rendered as HTML → stored XSS
    const r = await run(
      'INSERT INTO medical_records (patientId, doctorId, appointmentId, diagnosis, prescription, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [patientId, doctorId || req.user.id, appointmentId || null, diagnosis || '', prescription || '', notes || '']
    );
    res.json({ id: r.lastID });
  } catch (e) { next(e); }
});

router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const rows = await all(
      `SELECT r.*, d.fullName AS doctorName FROM medical_records r
       JOIN users d ON d.id = r.doctorId
       WHERE r.patientId = ? ORDER BY r.createdAt DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// Records authored by the currently logged-in doctor
router.get('/by-doctor', requireAuth, async (req, res, next) => {
  try {
    const rows = await all(
      `SELECT r.*, p.fullName AS patientName, p.dob AS patientDob
       FROM medical_records r
       JOIN users p ON p.id = r.patientId
       WHERE r.doctorId = ? ORDER BY r.createdAt DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// Records for a specific patient (used by doctor's patient panel)
router.get('/by-patient/:patientId', requireAuth, async (req, res, next) => {
  try {
    const rows = await all(
      `SELECT r.*, d.fullName AS doctorName
       FROM medical_records r
       JOIN users d ON d.id = r.doctorId
       WHERE r.patientId = ? ORDER BY r.createdAt DESC`,
      [req.params.patientId]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// VULN A01 (CRITICAL — BOLA): any authenticated user can fetch any medical record.
// Shannon should flag this as a HIPAA-level severity.
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const row = await get(
      `SELECT r.*, p.fullName AS patientName, p.dob AS patientDob, d.fullName AS doctorName
       FROM medical_records r
       JOIN users p ON p.id = r.patientId
       JOIN users d ON d.id = r.doctorId
       WHERE r.id = ?`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'record not found' });
    res.json(row);
  } catch (e) { next(e); }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    // VULN A01: ownership not verified
    const { diagnosis, prescription, notes } = req.body || {};
    await run(
      'UPDATE medical_records SET diagnosis = COALESCE(?, diagnosis), prescription = COALESCE(?, prescription), notes = COALESCE(?, notes) WHERE id = ?',
      [diagnosis ?? null, prescription ?? null, notes ?? null, req.params.id]
    );
    res.json({ message: 'updated' });
  } catch (e) { next(e); }
});

// VULN A01: path traversal via filename
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', '..', 'uploads'),
    filename: (req, file, cb) => {
      // VULN: uses client-provided filename directly (can include ../)
      const name = (req.body.filename || file.originalname || 'file').toString();
      cb(null, name);
    },
  }),
});

router.post('/:id/attachment', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file required' });
    // VULN: store the attacker-controlled path
    const relPath = '/uploads/' + path.basename(req.file.path);
    await run('UPDATE medical_records SET attachmentPath = ? WHERE id = ?', [relPath, req.params.id]);
    res.json({ message: 'uploaded', path: req.file.path, served: relPath });
  } catch (e) { next(e); }
});

// VULN A10/A03: simple XML export that naively resolves SYSTEM entities (XXE)
router.get('/export', requireAuth, async (req, res, next) => {
  try {
    const rows = await all('SELECT * FROM medical_records WHERE patientId = ? LIMIT 20', [req.user.id]);
    let xml = '<?xml version="1.0"?>\n<records>\n';
    for (const r of rows) {
      xml += `  <record id="${r.id}"><diagnosis>${r.diagnosis}</diagnosis><notes>${r.notes}</notes></record>\n`;
    }
    xml += '</records>';
    res.type('application/xml').send(xml);
  } catch (e) { next(e); }
});

module.exports = router;
