import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { currentUser } from '../../api';

export default function AdminDashboard() {
  const me = currentUser();
  const [stats, setStats] = useState(null);
  const [audit, setAudit] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/admin/stats')
      .then(r => setStats(r.data))
      .catch(e => setErr(e.response?.data?.error || e.message));
    api.get('/admin/audit-log', { params: { limit: 8 } })
      .then(r => setAudit(r.data.items || []))
      .catch(() => {});
  }, []);

  const totals = useMemo(() => {
    if (!stats) return null;
    const byRole = Object.fromEntries((stats.usersByRole || []).map(x => [x.role, x.count]));
    const byStatus = Object.fromEntries((stats.appointmentsByStatus || []).map(x => [x.status, x.count]));
    const totalUsers = (stats.usersByRole || []).reduce((s, x) => s + x.count, 0);
    const totalAppts = (stats.appointmentsByStatus || []).reduce((s, x) => s + x.count, 0);
    return { byRole, byStatus, totalUsers, totalAppts };
  }, [stats]);

  const initials = (me?.fullName || me?.username || 'AD')
    .split(/\s+/).map(p => p[0]).filter(Boolean).slice(0,2).join('').toUpperCase();

  return (
    <>
      <div className="card">
        <div className="dash-welcome">
          <div className="profile-header">
            <div className="profile-avatar">{initials}</div>
            <div className="profile-meta">
              <h2>Admin Control Panel</h2>
              <div className="handle">@{me?.username || 'admin'}</div>
              <span className="role-pill">Administrator</span>
            </div>
          </div>
          <div className="profile-actions">
            <Link to="/admin/users"><button>Manage users</button></Link>
            <Link to="/admin/diagnostics"><button className="secondary">Diagnostics</button></Link>
            <a href="/api-docs" target="_blank" rel="noreferrer"><button className="secondary">API Docs ↗</button></a>
          </div>
        </div>
      </div>

      {err && <div className="error">{err}</div>}

      {totals && (
        <div className="dash-stats">
          <div className="stat-card accent-indigo">
            <div className="stat-num">{totals.totalUsers}</div>
            <div className="stat-lbl">Total users</div>
            <div className="stat-sub">{totals.byRole.patient || 0} patients · {totals.byRole.doctor || 0} doctors</div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-num">{totals.totalAppts}</div>
            <div className="stat-lbl">Appointments</div>
            <div className="stat-sub">{totals.byStatus.booked || 0} booked · {totals.byStatus.done || 0} done</div>
          </div>
          <div className="stat-card accent-teal">
            <div className="stat-num">{stats.totalRecords}</div>
            <div className="stat-lbl">Medical records</div>
            <div className="stat-sub">across {stats.totalDepartments} departments</div>
          </div>
          <div className="stat-card accent-pink">
            <div className="stat-num">{stats.bannedUsers}</div>
            <div className="stat-lbl">Banned users</div>
            <div className="stat-sub">{stats.bannedUsers === 0 ? 'all clear' : 'review needed'}</div>
          </div>
        </div>
      )}

      <div className="split-2">
        <div className="card">
          <div className="dash-section-head">
            <h3>Users by role</h3>
            <Link to="/admin/users">Manage →</Link>
          </div>
          {totals ? (
            <table>
              <thead><tr><th>Role</th><th style={{textAlign:'right'}}>Count</th></tr></thead>
              <tbody>
                {(stats.usersByRole || []).map(r => (
                  <tr key={r.role}>
                    <td><span className={`role-tag role-${r.role}`}>{r.role}</span></td>
                    <td style={{textAlign:'right', fontWeight:600}}>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p>Loading…</p>}
        </div>

        <div className="card">
          <div className="dash-section-head">
            <h3>Appointments by status</h3>
          </div>
          {totals ? (
            <table>
              <thead><tr><th>Status</th><th style={{textAlign:'right'}}>Count</th></tr></thead>
              <tbody>
                {(stats.appointmentsByStatus || []).map(s => (
                  <tr key={s.status}>
                    <td><span className={`badge ${s.status}`}>{s.status}</span></td>
                    <td style={{textAlign:'right', fontWeight:600}}>{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p>Loading…</p>}
        </div>
      </div>

      <div className="card">
        <div className="dash-section-head">
          <h3>Recent admin activity</h3>
          <small>{audit.length} latest events</small>
        </div>
        {audit.length === 0 ? (
          <div className="empty-state">No audit entries yet.</div>
        ) : (
          <table>
            <thead>
              <tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr>
            </thead>
            <tbody>
              {audit.map(a => (
                <tr key={a.id}>
                  <td><small>{a.createdAt}</small></td>
                  <td>{a.actorUsername || `#${a.actorId}` || '—'}</td>
                  <td><code>{a.action}</code></td>
                  <td>{a.targetType ? `${a.targetType}#${a.targetId}` : '—'}</td>
                  <td><small>{a.details || '—'}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="dash-section-head">
          <h3>Quick links</h3>
        </div>
        <div className="admin-cards">
          <Link className="admin-card" to="/admin/users">
            <h3>User Management</h3>
            <p>List, edit, promote, ban, or reset passwords.</p>
          </Link>
          <Link className="admin-card" to="/admin/diagnostics">
            <h3>Server Diagnostics</h3>
            <p>Ping hosts and inspect server log files.</p>
          </Link>
          <Link className="admin-card" to="/admin/import">
            <h3>Import Departments</h3>
            <p>Fetch a departments XML feed from any URL.</p>
          </Link>
          <a className="admin-card" href="/api-docs" target="_blank" rel="noreferrer">
            <h3>API Docs ↗</h3>
            <p>Swagger UI for the VulHealth API.</p>
          </a>
        </div>
      </div>
    </>
  );
}
