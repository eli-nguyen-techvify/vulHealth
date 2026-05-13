import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { currentUser } from '../api';

export default function DoctorDetail() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [dept, setDept] = useState(null);
  const [err, setErr] = useState('');
  const me = currentUser();

  useEffect(() => {
    api.get(`/doctors/${id}`)
      .then(r => {
        setDoc(r.data);
        if (r.data?.departmentId) {
          api.get('/departments')
            .then(rd => setDept((rd.data || []).find(d => d.id === r.data.departmentId) || null))
            .catch(() => {});
        }
      })
      .catch(e => setErr(e.response?.data?.error || e.message));
  }, [id]);

  if (err) return <div className="error">{err}</div>;
  if (!doc) return <p>Loading…</p>;

  const initials = (doc.fullName || doc.username || '?')
    .split(/\s+/)
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      <div className="card">
        <div className="profile-header">
          <div className="profile-avatar">
            {doc.avatarUrl ? <img src={doc.avatarUrl} alt="avatar" /> : initials}
          </div>
          <div className="profile-meta">
            <h2>{doc.fullName}</h2>
            <div className="handle">@{doc.username}</div>
            <span className="role-pill">Doctor</span>
          </div>
        </div>
      </div>

      <div className="card profile-section">
        <h3>Contact</h3>
        <dl className="detail-grid">
          <dt>Full name</dt>
          <dd>{doc.fullName || '—'}</dd>
          <dt>Username</dt>
          <dd>@{doc.username}</dd>
          <dt>Phone</dt>
          <dd>{doc.phone || '—'}</dd>
          <dt>Department</dt>
          <dd>{dept ? dept.name : (doc.departmentId ? `#${doc.departmentId}` : '—')}</dd>
        </dl>
      </div>

      <div className="card profile-section">
        <h3>About</h3>
        <div style={{ whiteSpace: 'pre-wrap' }}>{doc.bio || <em>No bio.</em>}</div>
      </div>

      <div className="card profile-section">
        <h3>Actions</h3>
        {me ? (
          <div className="profile-actions">
            <Link to={`/book?doctorId=${doc.id}&departmentId=${doc.departmentId || ''}`}>
              <button>Book appointment</button>
            </Link>
            <Link to={`/messages?to=${doc.id}`}>
              <button className="secondary">Message this doctor</button>
            </Link>
          </div>
        ) : (
          <p><Link to="/login">Login to book</Link></p>
        )}
      </div>
    </>
  );
}
