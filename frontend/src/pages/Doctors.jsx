import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';

export default function Doctors() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [deptId, setDeptId] = useState(params.get('departmentId') || '');
  const [depts, setDepts] = useState([]);
  const [docs, setDocs] = useState([]);
  const [err, setErr] = useState('');

  const load = async () => {
    setErr('');
    try {
      const { data } = await api.get('/doctors', { params: { q, departmentId: deptId || undefined } });
      setDocs(data.doctors || []);
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  };

  useEffect(() => { api.get('/departments').then(r => setDepts(r.data)); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  function submit(e) {
    e.preventDefault();
    setParams({ q, ...(deptId && { departmentId: deptId }) });
    load();
  }

  return (
    <>
      <div className="card">
        <h2>Browse Doctors</h2>
        <form onSubmit={submit}>
          <div style={{display:'flex', gap:10, alignItems:'flex-end'}}>
            <label style={{flex:1}}><span>Search</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="name, bio, specialty"/></label>
            <label style={{flex:1}}><span>Department</span>
              <select value={deptId} onChange={e=>setDeptId(e.target.value)}>
                <option value="">— any —</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <button>Search</button>
          </div>
        </form>
        {err && <div className="error">{err}</div>}
      </div>

      <div className="grid">
        {docs.map(d => (
          <div key={d.id} className="doctor-card">
            <h3>{d.fullName}</h3>
            <p><small>@{d.username}</small></p>
            <p>Dept ID: {d.departmentId || '—'}</p>
            <Link to={`/doctors/${d.id}`}>View profile →</Link>
          </div>
        ))}
        {!docs.length && <p>No doctors found.</p>}
      </div>
    </>
  );
}
