const express = require('express');
const { get, all, run } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// VULN A01: patientId comes from body, not enforced to match req.user.id
// Also race condition: no check for time conflicts
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { patientId, doctorId, departmentId, scheduledAt, reason } = req.body || {};
    const finalPatientId = patientId || req.user.id; // if not provided, default to self (but attacker can override)
    if (!doctorId || !scheduledAt) {
      return res.status(400).json({ error: 'doctorId and scheduledAt required' });
    }
    const r = await run(
      'INSERT INTO appointments (patientId, doctorId, departmentId, scheduledAt, status, reason) VALUES (?, ?, ?, ?, ?, ?)',
      [finalPatientId, doctorId, departmentId || null, scheduledAt, 'booked', reason || null]
    );
    res.json({ id: r.lastID, patientId: finalPatientId, doctorId, scheduledAt });
  } catch (e) { next(e); }
});

// List my appointments (safe baseline)
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const role = req.user.role;
    let rows;
    if (role === 'doctor') {
      rows = await all(
        `SELECT a.*, p.fullName AS patientName FROM appointments a
         JOIN users p ON p.id = a.patientId
         WHERE a.doctorId = ? ORDER BY a.scheduledAt`,
        [req.user.id]
      );
    } else {
      rows = await all(
        `SELECT a.*, d.fullName AS doctorName FROM appointments a
         JOIN users d ON d.id = a.doctorId
         WHERE a.patientId = ? ORDER BY a.scheduledAt`,
        [req.user.id]
      );
    }
    res.json(rows);
  } catch (e) { next(e); }
});

// VULN A01: IDOR — any authenticated user can view any appointment
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const row = await get(
      `SELECT a.*, p.fullName AS patientName, p.dob AS patientDob, p.phone AS patientPhone,
              d.fullName AS doctorName, dep.name AS departmentName
       FROM appointments a
       JOIN users p ON p.id = a.patientId
       JOIN users d ON d.id = a.doctorId
       LEFT JOIN departments dep ON dep.id = a.departmentId
       WHERE a.id = ?`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  } catch (e) { next(e); }
});

// Update appointment status (used when doctor finishes a visit and writes the record)
router.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body || {};
    const allowed = ['booked', 'checked_in', 'done', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'invalid status' });
    }
    await run('UPDATE appointments SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'updated', status });
  } catch (e) { next(e); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    // VULN A01: doesn't validate ownership
    await run('UPDATE appointments SET status = "cancelled" WHERE id = ?', [req.params.id]);
    res.json({ message: 'cancelled' });
  } catch (e) { next(e); }
});

module.exports = router;
