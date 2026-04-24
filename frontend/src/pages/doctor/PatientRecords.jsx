import React, { useState } from 'react';
import api from '../../api';

export default function PatientRecords() {
  const [recordId, setRecordId] = useState('');
  const [record, setRecord] = useState(null);
  const [err, setErr] = useState('');

  async function load() {
    setErr(''); setRecord(null);
    try {
      const { data } = await api.get(`/records/${recordId}`);
      setRecord(data);
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  }

  return (
    <div className="card">
      <h2>Fetch a Medical Record</h2>
      <p><small>Enter any record id — access control is minimal.</small></p>
      <input value={recordId} onChange={e=>setRecordId(e.target.value)} placeholder="record id" />
      <button onClick={load} style={{marginLeft:8}}>Load</button>
      {err && <div className="error">{err}</div>}
      {record && (
        <div style={{ marginTop: 16 }}>
          <h3>Record #{record.id} — Patient: {record.patientName}</h3>
          <p><strong>Diagnosis:</strong> <span dangerouslySetInnerHTML={{__html: record.diagnosis}} /></p>
          <p><strong>Prescription:</strong> <span dangerouslySetInnerHTML={{__html: record.prescription}} /></p>
          <p><strong>Notes:</strong></p>
          <div dangerouslySetInnerHTML={{__html: record.notes}} />
        </div>
      )}
    </div>
  );
}
