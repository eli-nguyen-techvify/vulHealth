import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { currentUser } from '../api';

export default function BookAppointment() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    doctorId: params.get('doctorId') || '',
    departmentId: params.get('departmentId') || '',
    scheduledAt: '',
    reason: '',
  });
  const [docs, setDocs] = useState([]);
  const [depts, setDepts] = useState([]);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const nav = useNavigate();
  const me = currentUser();

  useEffect(() => {
    api.get('/doctors').then(r => setDocs(r.data.doctors));
    api.get('/departments').then(r => setDepts(r.data));
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setOk('');
    if (!me) return setErr('Please login first.');
    try {
      const { data } = await api.post('/appointments', form);
      setOk(`Appointment #${data.id} booked!`);
      setTimeout(() => nav('/appointments'), 1000);
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  }

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h2>Book an Appointment</h2>
      <form onSubmit={submit}>
        <label><span>Department</span>
          <select value={form.departmentId} onChange={upd('departmentId')}>
            <option value="">— any —</option>
            {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label><span>Doctor</span>
          <select value={form.doctorId} onChange={upd('doctorId')} required>
            <option value="">— select —</option>
            {docs.filter(d => !form.departmentId || d.departmentId == form.departmentId).map(d =>
              <option key={d.id} value={d.id}>{d.fullName}</option>)}
          </select>
        </label>
        <label><span>Date & time</span><input type="datetime-local" value={form.scheduledAt} onChange={upd('scheduledAt')} required /></label>
        <label><span>Reason</span><textarea value={form.reason} onChange={upd('reason')} /></label>
        {err && <div className="error">{err}</div>}
        {ok  && <div className="ok">{ok}</div>}
        <button>Book</button>
      </form>
    </div>
  );
}
