const express = require('express');
const { get, all } = require('../db');

const router = express.Router();

// VULN A03: SQLi via `q` and `departmentId`
router.get('/', async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const departmentId = req.query.departmentId;
    let sql = `SELECT id, username, fullName, phone, avatarUrl, departmentId, bio FROM users WHERE role = 'doctor'`;
    if (q) sql += ` AND (fullName LIKE '%${q}%' OR username LIKE '%${q}%' OR bio LIKE '%${q}%')`;
    if (departmentId) sql += ` AND departmentId = ${departmentId}`;
    sql += ' ORDER BY fullName';
    const rows = await all(sql);
    res.json({ query: q, departmentId, count: rows.length, doctors: rows });
  } catch (e) {
    e.sql = e.sql || req.query;
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    // VULN A03: SQLi via path param
    const sql = `SELECT id, username, fullName, phone, avatarUrl, departmentId, bio FROM users WHERE role = 'doctor' AND id = ${id}`;
    const doctor = await get(sql);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json(doctor);
  } catch (e) { next(e); }
});

module.exports = router;
