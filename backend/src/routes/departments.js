const express = require('express');
const { get, all } = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const rows = await all(`
      SELECT d.*, u.fullName AS headDoctorName
      FROM departments d
      LEFT JOIN users u ON u.id = d.headDoctorId
      ORDER BY d.id
    `);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const dept = await get(`SELECT * FROM departments WHERE id = ${id}`); // VULN A03: SQLi
    if (!dept) return res.status(404).json({ error: 'not found' });
    const doctors = await all(`SELECT id, username, fullName, phone, avatarUrl FROM users WHERE role = 'doctor' AND departmentId = ${id}`);
    res.json({ ...dept, doctors });
  } catch (e) { next(e); }
});

module.exports = router;
