import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { currentUser } from '../../api';

export default function WriteRecord() {
  const me = currentUser();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const presetApptId = params.get('appointmentId') || '';

  const [appts, setAppts] = useState([]);
  const [records, setRecords] = useState([]);
  const [appointmentId, setAppointmentId] = useState(presetApptId);
  const [patientId, setPatientId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [notes, setNotes] = useState('');
  const [markDone, setMarkDone] = useState(true);
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/appointments/mine').then(r => setAppts(r.data)).catch(e => setErr(e.response?.data?.error || e.message));
    api.get('/records/by-doctor').then(r => setRecords(r.data)).catch(() => {});
  }, []);

  // Set of appointmentIds that already have a record
  const recordedApptIds = useMemo(
    () => new Set(records.map(r => r.appointmentId).filter(Boolean)),
    [records]
  );

  // Open appointments = doctor's appointments not already recorded and not cancelled
  const openAppts = useMemo(() => {
    return appts
      .filter(a => !recordedApptIds.has(a.id))
      .filter(a => a.status !== 'cancelled')
      .sort((a, b) => (a.scheduledAt || '').localeCompare(b.scheduledAt || ''));
  }, [appts, recordedApptIds]);

  const selected = useMemo(
    () => appts.find(a => String(a.id) === String(appointmentId)) || null,
    [appts, appointmentId]
  );

  // Auto-fill patientId from selected appointment
  useEffect(() => {
    if (selected) setPatientId(String(selected.patientId));
  }, [selected]);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setOk(''); setSaving(true);
    try {
      const body = {
        patientId: Number(patientId),
        appointmentId: appointmentId ? Number(appointmentId) : null,
        diagnosis,
        prescription,
        notes,
      };
      const { data } = await api.post('/records', body);
      if (markDone && appointmentId) {
        try {
          await api.patch(`/appointments/${appointmentId}/status`, { status: 'done' });
        } catch (_) { /* non-fatal */ }
      }
      setOk(`Record #${data.id} saved.${markDone && appointmentId ? ' Appointment marked as done.' : ''}`);
      // Reset form
      setAppointmentId('');
      setPatientId('');
      setDiagnosis('');
      setPrescription('');
      setNotes('');
      // Refresh records list so subsequent saves know which appts are recorded
      api.get('/records/by-doctor').then(r => setRecords(r.data)).catch(() => {});
      api.get('/appointments/mine').then(r => setAppts(r.data)).catch(() => {});
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!me) {
    return (
      <div className="card">
        <h2>Write Medical Record</h2>
        <p>Bạn cần <Link to="/login">đăng nhập</Link> với tài khoản bác sĩ.</p>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="dash-welcome">
          <div>
            <h2>Write Medical Record</h2>
            <p style={{margin:0}}>Pick an open appointment, fill in the visit notes, and save.</p>
          </div>
          <div className="profile-actions">
            <Link to="/doctor/patients"><button className="secondary">My patients</button></Link>
            <Link to="/doctor"><button className="secondary">Back to dashboard</button></Link>
          </div>
        </div>
      </div>

      <div className="card">
        <form onSubmit={submit}>
          <label>
            <span>Appointment</span>
            <select value={appointmentId} onChange={e => setAppointmentId(e.target.value)}>
              <option value="">— Select an appointment —</option>
              {openAppts.map(a => (
                <option key={a.id} value={a.id}>
                  #{a.id} · {a.scheduledAt} · {a.patientName} ({a.status})
                </option>
              ))}
            </select>
            <small>{openAppts.length} open appointment(s) without a record yet.</small>
          </label>

          {selected && (
            <div className="card" style={{background: 'var(--off)', marginBottom: 18}}>
              <h4 style={{margin: '0 0 10px'}}>Visit context</h4>
              <dl className="detail-grid">
                <dt>Patient</dt><dd>{selected.patientName} (ID #{selected.patientId})</dd>
                <dt>Scheduled</dt><dd>{selected.scheduledAt}</dd>
                <dt>Reason</dt><dd>{selected.reason || '—'}</dd>
                <dt>Status</dt><dd><span className={`badge ${selected.status}`}>{selected.status}</span></dd>
              </dl>
            </div>
          )}

          <label>
            <span>Patient ID {selected && <small>(auto-filled from appointment)</small>}</span>
            <input
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
              required
              readOnly={!!selected}
              placeholder="patient id"
            />
          </label>

          <label><span>Diagnosis</span><textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="e.g. Stable angina" /></label>
          <label><span>Prescription</span><textarea value={prescription} onChange={e => setPrescription(e.target.value)} placeholder="e.g. Aspirin 81mg daily" /></label>
          <label><span>Notes</span><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Visit observations, follow-up plan..." /></label>

          {appointmentId && (
            <label style={{display:'flex', alignItems:'center', gap:10, marginBottom: 18}}>
              <input
                type="checkbox"
                checked={markDone}
                onChange={e => setMarkDone(e.target.checked)}
                style={{width:'auto'}}
              />
              <span style={{margin:0}}>Mark this appointment as <strong>done</strong> after saving</span>
            </label>
          )}

          {err && <div className="error">{err}</div>}
          {ok  && <div className="ok">{ok}</div>}
          <button disabled={saving || !patientId}>{saving ? 'Saving…' : 'Save record'}</button>
          {' '}
          <button
            type="button"
            className="secondary"
            onClick={() => nav('/doctor')}
          >
            Cancel
          </button>
        </form>
      </div>
    </>
  );
}
