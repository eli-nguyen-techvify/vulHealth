import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [editing, setEditing] = useState(null);

  async function load() {
    try { const { data } = await api.get('/admin/users'); setUsers(data); }
    catch (e) { setErr(e.response?.data?.error || e.message); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setErr(''); setOk('');
    try {
      await api.put(`/admin/users/${editing.id}`, editing);
      setOk('Updated'); setEditing(null); load();
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  }

  return (
    <div className="card">
      <h2>User Management</h2>
      {err && <div className="error">{err}</div>}
      {ok  && <div className="ok">{ok}</div>}
      <table>
        <thead><tr><th>ID</th><th>Username</th><th>Email</th><th>Role</th><th>Password hash</th><th></th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.id}</td><td>{u.username}</td><td>{u.email}</td><td>{u.role}</td>
              <td><code style={{fontSize:11}}>{u.passwordHash}</code></td>
              <td><button className="secondary" onClick={() => setEditing(u)}>Edit</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && (
        <div className="card" style={{marginTop:20, background:'#fff7ed'}}>
          <h3>Editing user #{editing.id}</h3>
          <label><span>Role</span>
            <select value={editing.role} onChange={e=>setEditing({...editing, role:e.target.value})}>
              <option>patient</option><option>doctor</option><option>receptionist</option><option>admin</option>
            </select>
          </label>
          <label><span>Full name</span><input value={editing.fullName||''} onChange={e=>setEditing({...editing, fullName:e.target.value})} /></label>
          <button onClick={save}>Save</button>{' '}
          <button className="secondary" onClick={() => setEditing(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}
