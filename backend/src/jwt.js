const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET;
const WEAK_SECRETS = new Set(['secret', 'changeme', 'password', '']);

if (!SECRET || WEAK_SECRETS.has(SECRET) || SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET must be set to a strong, unique value (>= 32 chars). ' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
  );
}

const ALG = 'HS256';

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}

function sign(payload) {
  const header = { alg: ALG, typ: 'JWT' };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest();
  return `${h}.${p}.${b64url(sig)}`;
}

function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  if (!h || !p || !s) return null;

  let header;
  try {
    header = JSON.parse(b64urlDecode(h).toString());
  } catch (_) {
    return null;
  }

  if (!header || header.alg !== ALG || header.typ !== 'JWT') {
    return null;
  }

  const expected = crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest();
  let actual;
  try {
    actual = b64urlDecode(s);
  } catch (_) {
    return null;
  }
  if (expected.length !== actual.length) return null;
  if (!crypto.timingSafeEqual(expected, actual)) return null;

  try {
    return JSON.parse(b64urlDecode(p).toString());
  } catch (_) {
    return null;
  }
}

module.exports = { sign, verify };
