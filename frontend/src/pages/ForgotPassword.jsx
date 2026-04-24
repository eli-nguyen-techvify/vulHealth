import React, { useState } from 'react';
import api from '../api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr(''); setResult(null);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setResult(data);
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  }

  return (
    <div className="card" style={{ maxWidth: 460, margin: '40px auto' }}>
      <h2>Forgot Password</h2>
      <form onSubmit={submit}>
        <label><span>Email</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
        <button>Send reset token</button>
      </form>
      {err && <div className="error">{err}</div>}
      {result && (
        <div className="ok">
          <p>{result.message}</p>
          <p>Reset link (dev): <code>{result.reset_url}</code></p>
        </div>
      )}
    </div>
  );
}
