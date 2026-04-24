import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { currentUser } from '../api';

export default function DoctorDetail() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState('');
  const me = currentUser();

  useEffect(() => {
    api.get(`/doctors/${id}`).then(r => setDoc(r.data)).catch(e => setErr(e.response?.data?.error || e.message));
  }, [id]);

  if (err) return <div className="error">{err}</div>;
  if (!doc) return <p>Loading…</p>;

  return (
    <div className="card">
      <h2>{doc.fullName}</h2>
      <p><small>@{doc.username} · Phone: {doc.phone}</small></p>
      {/* VULN: stored XSS — bio rendered as HTML */}
      <div dangerouslySetInnerHTML={{ __html: doc.bio || '<em>No bio.</em>' }} />
      <hr/>
      {me ? (
        <p>
          <Link to={`/book?doctorId=${doc.id}&departmentId=${doc.departmentId || ''}`}>Book appointment →</Link>
          {' · '}
          <Link to={`/messages?to=${doc.id}`}>Message this doctor →</Link>
        </p>
      ) : (
        <p><Link to="/login">Login to book</Link></p>
      )}
    </div>
  );
}
