const express = require('express');
const crypto = require('crypto');
const { get, run } = require('../db');
const { sign } = require('../jwt');

const router = express.Router();

// VULN A02: MD5 password hashing
function md5(pw) {
  return crypto.createHash('md5').update(pw).digest('hex');
}

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username/password required' });

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'invalid credentials' });
    }

    const hash = md5(password);
    const user = await get(
      'SELECT id, username, email, role, fullName FROM users WHERE username = ? AND passwordHash = ?',
      [username, hash]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = sign({ id: user.id, username: user.username, role: user.role, email: user.email });
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.json({ token, user });
  } catch (e) {
    next(e);
  }
});

// VULN A07: weak password policy — accepts anything >= 1 char
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password, fullName, dob, phone } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, password required' });
    }
    const existing = await get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing) {
      // VULN A07: leaks whether username/email is taken
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    const hash = md5(password);
    const r = await run(
      'INSERT INTO users (username, email, passwordHash, role, fullName, dob, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, email, hash, 'patient', fullName || null, dob || null, phone || null]
    );
    const token = sign({ id: r.lastID, username, role: 'patient', email });
    res.json({ token, user: { id: r.lastID, username, email, role: 'patient', fullName } });
  } catch (e) { next(e); }
});

// VULN A04: predictable reset token (md5(email + Date.now()))
// VULN A05: dev mode returns token in response
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email required' });
    const user = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (!user) {
      // VULN A07: different response than success — account enumeration
      return res.status(404).json({ error: 'No user with that email' });
    }
    const token = crypto.createHash('md5').update(email + Date.now()).digest('hex');
    await run('INSERT INTO password_resets (email, token) VALUES (?, ?)', [email, token]);
    // VULN: leak reset token in response (dev mode) — in prod would be emailed
    res.json({
      message: 'Password reset token generated. In production this would be emailed.',
      debug_token: token,
      reset_url: `/reset-password?token=${token}&email=${encodeURIComponent(email)}`,
    });
  } catch (e) { next(e); }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, token, newPassword } = req.body || {};
    if (!email || !token || !newPassword) return res.status(400).json({ error: 'missing fields' });
    const r = await get(
      'SELECT id FROM password_resets WHERE email = ? AND token = ? AND usedAt IS NULL',
      [email, token]
    );
    if (!r) return res.status(400).json({ error: 'Invalid or used token' });
    await run('UPDATE users SET passwordHash = ? WHERE email = ?', [md5(newPassword), email]);
    await run('UPDATE password_resets SET usedAt = CURRENT_TIMESTAMP WHERE id = ?', [r.id]);
    res.json({ message: 'Password updated' });
  } catch (e) { next(e); }
});

// Mock OAuth — open redirect demo
router.get('/oauth/callback', (req, res) => {
  const redirect = req.query.redirect || '/';
  // VULN A01: unvalidated redirect
  res.redirect(redirect);
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'logged out' });
});

module.exports = router;
