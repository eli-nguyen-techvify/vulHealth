import React, { useState } from 'react';
import api from '../../api';

export default function WriteRecord() {
  const [form, setForm] = useState({ patientId:'', appointmentId:'', diagnosis:'', prescription:'', notes:'' });
  const [ok, setOk] = useState(''); const [err, setErr] = useState('');
  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr(''); setOk('');
    try {
      const { data } = await api.post('/records', form);
      setOk(`Record #${data.id} saved.`);
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  }

  return (
    <div className="card">
      <h2>Write Medical Record</h2>
      <p><small>Diagnosis/notes are rendered as HTML for the patient 🤡 — demonstrates stored XSS.</small></p>
      <form onSubmit={submit}>
        <label><span>Patient ID</span><input value={form.patientId} onChange={upd('patientId')} required /></label>
        <label><span>Appointment ID (optional)</span><input value={form.appointmentId} onChange={upd('appointmentId')} /></label>
        <label><span>Diagnosis</span><textarea value={form.diagnosis} onChange={upd('diagnosis')} /></label>
        <label><span>Prescription</span><textarea value={form.prescription} onChange={upd('prescription')} /></label>
        <label><span>Notes</span><textarea value={form.notes} onChange={upd('notes')} /></label>
        {err && <div className="error">{err}</div>}
        {ok  && <div className="ok">{ok}</div>}
        <button>Save</button>
      </form>
    </div>
  );
}
