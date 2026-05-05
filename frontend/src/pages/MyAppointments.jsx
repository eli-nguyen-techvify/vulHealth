import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { currentUser } from '../api';

export default function MyAppointments() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailErr, setDetailErr] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const user = currentUser();

  useEffect(() => {
    if (!user) return;
    api.get('/appointments/mine').then(r => setList(r.data)).catch(e => setErr(e.response?.data?.error || e.message));
  }, [user]);

  async function openDetail(id) {
    setDetail(null); setDetailErr(''); setLoadingDetail(true);
    try {
      const { data } = await api.get(`/appointments/${id}`);
      setDetail(data);
    } catch (e) {
      setDetailErr(e.response?.data?.error || e.message);
    } finally {
      setLoadingDetail(false);
    }
  }
  function closeDetail() { setDetail(null); setDetailErr(''); }

  if (err) return <div className="error">{err}</div>;

  return (
    <div className="card">
      <h2>My Appointments</h2>
      <table>
        <thead><tr><th>ID</th><th>Date</th><th>Doctor</th><th>Reason</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {list.map(a => (
            <tr key={a.id}>
              <td>
                <a href="#" onClick={e => { e.preventDefault(); openDetail(a.id); }}>#{a.id}</a>
              </td>
              <td>{a.scheduledAt}</td>
              <td>{a.doctorName || `Dr. #${a.doctorId}`}</td>
              <td>{a.reason}</td>
              <td><span className={`badge ${a.status}`}>{a.status}</span></td>
              <td>
                <button className="secondary" onClick={() => openDetail(a.id)}>View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!list.length && (
        user
          ? <p>No appointments yet. <Link to="/book">Book one →</Link></p>
          : <p>Bạn chưa có lịch hẹn nào. <Link to="/login">Đăng nhập</Link> để xem lịch hẹn của bạn.</p>
      )}

      {(detail || detailErr || loadingDetail) && (
        <div className="modal-backdrop" onClick={closeDetail}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Appointment detail {detail ? `#${detail.id}` : ''}</h3>
              <button className="modal-close" onClick={closeDetail} aria-label="Close">×</button>
            </div>
            <div className="modal-body">
              {loadingDetail && <p>Loading…</p>}
              {detailErr && <div className="error">{detailErr}</div>}
              {detail && (
                <dl className="detail-grid">
                  <dt>Status</dt>
                  <dd><span className={`badge ${detail.status}`}>{detail.status}</span></dd>
                  <dt>Scheduled at</dt>
                  <dd>{detail.scheduledAt}</dd>
                  <dt>Doctor</dt>
                  <dd>{detail.doctorName || `#${detail.doctorId}`}</dd>
                  <dt>Patient</dt>
                  <dd>{detail.patientName || `#${detail.patientId}`}</dd>
                  {detail.patientDob && (<><dt>Patient DOB</dt><dd>{detail.patientDob}</dd></>)}
                  {detail.patientPhone && (<><dt>Patient phone</dt><dd>{detail.patientPhone}</dd></>)}
                  <dt>Department</dt>
                  <dd>{detail.departmentName || '—'}</dd>
                  <dt>Reason</dt>
                  <dd>{detail.reason || '—'}</dd>
                  <dt>Created</dt>
                  <dd>{detail.createdAt}</dd>
                </dl>
              )}
            </div>
            <div className="modal-footer">
              <button className="secondary" onClick={closeDetail}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
