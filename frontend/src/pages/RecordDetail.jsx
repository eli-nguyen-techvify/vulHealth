import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

export default function RecordDetail() {
  const { id } = useParams();
  const [r, setR] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get(`/records/${id}`).then(res => setR(res.data)).catch(e => setErr(e.response?.data?.error || e.message));
  }, [id]);

  if (err) return <div className="error">{err}</div>;
  if (!r) return <p>Loading…</p>;

  return (
    <div className="card">
      <h2>Medical Record #{r.id}</h2>
      <p><strong>Patient:</strong> {r.patientName} (DOB: {r.patientDob})</p>
      <p><strong>Doctor:</strong> {r.doctorName}</p>
      <p><strong>Created:</strong> {r.createdAt}</p>
      <hr />
      <h3>Diagnosis</h3>
      {/* VULN: stored XSS — notes/diagnosis rendered as HTML */}
      <div dangerouslySetInnerHTML={{ __html: r.diagnosis || '—' }} />
      <h3>Prescription</h3>
      <div dangerouslySetInnerHTML={{ __html: r.prescription || '—' }} />
      <h3>Notes</h3>
      <div dangerouslySetInnerHTML={{ __html: r.notes || '—' }} />
      {r.attachmentPath && <p><a href={r.attachmentPath} target="_blank">📎 Attachment</a></p>}
    </div>
  );
}
