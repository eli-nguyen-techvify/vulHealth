import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { currentUser } from '../../api';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function DoctorDashboard() {
  const me = currentUser();
  const [appts, setAppts] = useState([]);
  const [err, setErr] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailErr, setDetailErr] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    api.get('/appointments/mine')
      .then(r => setAppts(r.data))
      .catch(e => setErr(e.response?.data?.error || e.message));
  }, []);

  const today = todayStr();

  const stats = useMemo(() => ({
    total:    appts.length,
    today:    appts.filter(a => (a.scheduledAt || '').startsWith(today)).length,
    upcoming: appts.filter(a => a.status === 'booked').length,
    done:     appts.filter(a => a.status === 'done').length,
  }), [appts, today]);

  const todayList = useMemo(
    () => appts.filter(a => (a.scheduledAt || '').startsWith(today))
                .sort((a,b) => (a.scheduledAt||'').localeCompare(b.scheduledAt||'')),
    [appts, today]
  );

  const upcoming = useMemo(
    () => appts.filter(a => a.status === 'booked' && (a.scheduledAt || '') >= today)
                .sort((a,b) => (a.scheduledAt||'').localeCompare(b.scheduledAt||''))
                .slice(0, 8),
    [appts, today]
  );

  const recent = useMemo(
    () => appts.filter(a => a.status === 'done')
                .sort((a,b) => (b.scheduledAt||'').localeCompare(a.scheduledAt||''))
                .slice(0, 5),
    [appts]
  );

  const initials = (me?.fullName || me?.username || 'Dr')
    .split(/\s+/).map(p => p[0]).filter(Boolean).slice(0,2).join('').toUpperCase();

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

  return (
    <>
      <div className="card">
        <div className="dash-welcome">
          <div className="profile-header">
            <div className="profile-avatar">{initials}</div>
            <div className="profile-meta">
              <h2>Welcome back, {me?.fullName || 'Doctor'}</h2>
              <div className="handle">@{me?.username} · {today}</div>
              <span className="role-pill">Doctor</span>
            </div>
          </div>
          <div className="profile-actions">
            <Link to="/doctor/write-record"><button>+ Write record</button></Link>
            <Link to="/doctor/patients"><button className="secondary">Lookup record</button></Link>
            <Link to="/messages"><button className="secondary">Messages</button></Link>
          </div>
        </div>
      </div>

      {err && <div className="error">{err}</div>}

      <div className="dash-stats">
        <div className="stat-card accent-indigo">
          <div className="stat-num">{stats.total}</div>
          <div className="stat-lbl">Total appointments</div>
          <div className="stat-sub">all time</div>
        </div>
        <div className="stat-card accent-amber">
          <div className="stat-num">{stats.today}</div>
          <div className="stat-lbl">Today</div>
          <div className="stat-sub">scheduled for {today}</div>
        </div>
        <div className="stat-card accent-teal">
          <div className="stat-num">{stats.upcoming}</div>
          <div className="stat-lbl">Upcoming</div>
          <div className="stat-sub">status = booked</div>
        </div>
        <div className="stat-card accent-pink">
          <div className="stat-num">{stats.done}</div>
          <div className="stat-lbl">Completed</div>
          <div className="stat-sub">status = done</div>
        </div>
      </div>

      <div className="card">
        <div className="dash-section-head">
          <h3>Today's schedule</h3>
          <small>{todayList.length} appointment(s)</small>
        </div>
        {todayList.length === 0 ? (
          <div className="empty-state">No appointments scheduled for today.</div>
        ) : (
          <table>
            <thead><tr><th>Time</th><th>Patient</th><th>Reason</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {todayList.map(a => (
                <tr key={a.id}>
                  <td>{(a.scheduledAt || '').slice(11) || '—'}</td>
                  <td>{a.patientName}</td>
                  <td>{a.reason}</td>
                  <td><span className={`badge ${a.status}`}>{a.status}</span></td>
                  <td>
                    <button className="secondary" onClick={() => openDetail(a.id)}>View</button>
                    {' '}
                    {a.status !== 'done' && a.status !== 'cancelled' && (
                      <Link to={`/doctor/write-record?appointmentId=${a.id}`}>
                        <button>Write</button>
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="dash-section-head">
          <h3>Upcoming appointments</h3>
          <Link to="/appointments">View all →</Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="empty-state">No upcoming appointments.</div>
        ) : (
          <table>
            <thead><tr><th>Date</th><th>Patient</th><th>Reason</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {upcoming.map(a => (
                <tr key={a.id}>
                  <td>{a.scheduledAt}</td>
                  <td>{a.patientName}</td>
                  <td>{a.reason}</td>
                  <td><span className={`badge ${a.status}`}>{a.status}</span></td>
                  <td><button className="secondary" onClick={() => openDetail(a.id)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {recent.length > 0 && (
        <div className="card">
          <div className="dash-section-head">
            <h3>Recent completed</h3>
          </div>
          <table>
            <thead><tr><th>Date</th><th>Patient</th><th>Reason</th><th></th></tr></thead>
            <tbody>
              {recent.map(a => (
                <tr key={a.id}>
                  <td>{a.scheduledAt}</td>
                  <td>{a.patientName}</td>
                  <td>{a.reason}</td>
                  <td><button className="secondary" onClick={() => openDetail(a.id)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    </>
  );
}
