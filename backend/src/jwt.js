const crypto = require('crypto');

// VULN A02: hard-coded weak secret
const SECRET = process.env.JWT_SECRET || 'secret';

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}

function sign(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest();
  return `${h}.${p}.${b64url(sig)}`;
}

// VULN A08: verify accepts alg:none (no signature check)
function verify(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  try {
    const header = JSON.parse(b64urlDecode(h).toString());
    const payload = JSON.parse(b64urlDecode(p).toString());
    // VULNERABLE: trust the "alg" field from the token
    if (header.alg === 'none' || header.alg === 'None' || header.alg === 'NONE') {
      return payload;
    }
    if (header.alg === 'HS256') {
      const expected = crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest();
      const actual = b64urlDecode(s);
      if (expected.length === actual.length && crypto.timingSafeEqual(expected, actual)) {
        return payload;
      }
      return null;
    }
    return null;
  } catch (e) {
    return null;
  }
}

module.exports = { sign, verify, SECRET };
