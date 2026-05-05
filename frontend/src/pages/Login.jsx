import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { setAuth } from '../api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      const { data } = await api.post('/auth/login', { username, password });
      setAuth(data.token, data.user);
      if (data.user.role === 'admin') nav('/admin');
      else if (data.user.role === 'doctor') nav('/doctor');
      else if (data.user.role === 'receptionist') nav('/appointments');
      else nav('/');
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: '40px auto' }}>
      <h2>Login</h2>
      <form onSubmit={submit}>
        <label><span>Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label><span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {err && <div className="error">{err}</div>}
        <button>Sign in</button>
      </form>
      <p style={{ marginTop: 16 }}>
        <Link to="/register">Create an account</Link> · <Link to="/forgot-password">Forgot password?</Link>
      </p>
    </div>
  );
}
