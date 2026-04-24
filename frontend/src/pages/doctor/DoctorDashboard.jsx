import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';

export default function DoctorDashboard() {
  const [appts, setAppts] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/appointments/mine').then(r => setAppts(r.data)).catch(e => setErr(e.response?.data?.error || e.message));
  }, []);

  return (
    <div className="card">
      <h2>Doctor Dashboard</h2>
      <p><Link to="/doctor/write-record">+ Write new record</Link> · <Link to="/doctor/patients">View my patients</Link></p>
      {err && <div className="error">{err}</div>}
      <h3>My Appointments</h3>
      <table>
        <thead><tr><th>ID</th><th>When</th><th>Patient</th><th>Reason</th><th>Status</th></tr></thead>
        <tbody>
          {appts.map(a => (
            <tr key={a.id}>
              <td>#{a.id}</td><td>{a.scheduledAt}</td><td>{a.patientName}</td><td>{a.reason}</td>
              <td><span className={`badge ${a.status}`}>{a.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
