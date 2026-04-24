import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function MyAppointments() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/appointments/mine').then(r => setList(r.data)).catch(e => setErr(e.response?.data?.error || e.message));
  }, []);

  if (err) return <div className="error">{err}</div>;

  return (
    <div className="card">
      <h2>My Appointments</h2>
      <table>
        <thead><tr><th>ID</th><th>Date</th><th>Doctor</th><th>Reason</th><th>Status</th></tr></thead>
        <tbody>
          {list.map(a => (
            <tr key={a.id}>
              <td><Link to={`/appointments/${a.id}`}>#{a.id}</Link></td>
              <td>{a.scheduledAt}</td>
              <td>{a.doctorName || `Dr. #${a.doctorId}`}</td>
              <td>{a.reason}</td>
              <td><span className={`badge ${a.status}`}>{a.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!list.length && <p>No appointments yet. <Link to="/book">Book one →</Link></p>}
    </div>
  );
}
