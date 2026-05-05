import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { currentUser } from '../api';

export default function MyRecords() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const user = currentUser();

  useEffect(() => {
    if (!user) return;
    api.get('/records/mine').then(r => setList(r.data)).catch(e => setErr(e.response?.data?.error || e.message));
  }, [user]);

  if (err) return <div className="error">{err}</div>;

  return (
    <div className="card">
      <h2>My Medical Records</h2>
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
      {!list.length && (
        user
          ? <p>No records yet.</p>
          : <p>Bạn chưa có hồ sơ bệnh án nào. <Link to="/login">Đăng nhập</Link> để xem hồ sơ của bạn.</p>
      )}
    </div>
  );
}
