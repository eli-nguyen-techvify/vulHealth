import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { setAuth } from '../api';

export default function Register() {
  const [form, setForm] = useState({ username:'', email:'', password:'', fullName:'', dob:'', phone:'' });
  const [err, setErr] = useState('');
  const nav = useNavigate();
  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      const { data } = await api.post('/auth/register', form);
      setAuth(data.token, data.user);
      nav('/');
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  }

  return (
    <div className="card" style={{ maxWidth: 500, margin: '40px auto' }}>
      <h2>Patient Registration</h2>
      <form onSubmit={submit}>
        <label><span>Username</span><input value={form.username} onChange={upd('username')} required /></label>
        <label><span>Email</span><input type="email" value={form.email} onChange={upd('email')} required /></label>
        <label><span>Password</span><input type="password" value={form.password} onChange={upd('password')} required /></label>
        <label><span>Full name</span><input value={form.fullName} onChange={upd('fullName')} /></label>
        <label><span>Date of birth</span><input type="date" value={form.dob} onChange={upd('dob')} /></label>
        <label><span>Phone</span><input value={form.phone} onChange={upd('phone')} /></label>
        {err && <div className="error">{err}</div>}
        <button>Register</button>
      </form>
      <p style={{marginTop:12}}><Link to="/login">Already have an account? Sign in</Link></p>
    </div>
  );
}
