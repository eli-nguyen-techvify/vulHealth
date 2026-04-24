import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function MyRecords() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/records/mine').then(r => setList(r.data)).catch(e => setErr(e.response?.data?.error || e.message));
  }, []);

  if (err) return <div className="error">{err}</div>;

  return (
    <div className="card">
      <h2>My Medical Records</h2>
      <p><small>Hint: try visiting <code>/records/1</code>, <code>/records/2</code>, … and see if you can read other patients' records (BOLA).</small></p>
      <table>
        <thead><tr><th>ID</th><th>Date</th><th>Doctor</th><th>Diagnosis</th></tr></thead>
        <tbody>
          {list.map(r => (
            <tr key={r.id}>
              <td><Link to={`/records/${r.id}`}>#{r.id}</Link></td>
              <td>{r.createdAt}</td>
              <td>{r.doctorName}</td>
              <td>{r.diagnosis}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!list.length && <p>No records yet.</p>}
    </div>
  );
}
