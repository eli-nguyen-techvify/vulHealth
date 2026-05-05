import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { currentUser } from '../../api';

export default function PatientRecords() {
  const user = currentUser();
  const [appts, setAppts] = useState([]);
  const [records, setRecords] = useState([]);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientRecs, setPatientRecs] = useState([]);
  const [recDetail, setRecDetail] = useState(null);
  const [recDetailErr, setRecDetailErr] = useState('');

  // Manual lookup (kept as a small utility)
  const [lookupId, setLookupId] = useState('');
  const [lookupRec, setLookupRec] = useState(null);
  const [lookupErr, setLookupErr] = useState('');

  useEffect(() => {
    if (!user) return;
    api.get('/appointments/mine')
      .then(r => setAppts(r.data))
      .catch(e => setErr(e.response?.data?.error || e.message));
    api.get('/records/by-doctor')
      .then(r => setRecords(r.data))
      .catch(() => {});
  }, []);

  // Aggregate distinct patients from appointments + records
  const patients = useMemo(() => {
    const m = new Map();
    for (const a of appts) {
      if (!a.patientId) continue;
      const p = m.get(a.patientId) || { id: a.patientId, name: a.patientName, appts: 0, records: 0, last: null };
      p.appts += 1;
      if (!p.last || (a.scheduledAt || '').localeCompare(p.last) > 0) p.last = a.scheduledAt;
      m.set(a.patientId, p);
    }
    for (const r of records) {
      if (!r.patientId) continue;
      const p = m.get(r.patientId) || { id: r.patientId, name: r.patientName, appts: 0, records: 0, last: null };
      p.records += 1;
      if (r.patientName && !p.name) p.name = r.patientName;
      m.set(r.patientId, p);
    }
    let arr = [...m.values()].sort((a, b) => (b.last || '').localeCompare(a.last || ''));
    if (q.trim()) {
      const ql = q.trim().toLowerCase();
      arr = arr.filter(p => (p.name || '').toLowerCase().includes(ql) || String(p.id).includes(ql));
    }
    return arr;
  }, [appts, records, q]);

  async function openPatient(p) {
    setSelectedPatient(p);
    setPatientRecs([]);
    try {
      const { data } = await api.get(`/records/by-patient/${p.id}`);
      setPatientRecs(data);
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  }
  function closePatient() {
    setSelectedPatient(null);
    setPatientRecs([]);
  }

  async function openRecord(id) {
    setRecDetail(null); setRecDetailErr('');
    try {
      const { data } = await api.get(`/records/${id}`);
      setRecDetail(data);
    } catch (e) { setRecDetailErr(e.response?.data?.error || e.message); }
  }
  function closeRecord() { setRecDetail(null); setRecDetailErr(''); }

  async function lookup() {
    setLookupErr(''); setLookupRec(null);
    try {
      const { data } = await api.get(`/records/${lookupId}`);
      setLookupRec(data);
    } catch (e) { setLookupErr(e.response?.data?.error || e.message); }
  }

  if (!user) {
    return (
      <div className="card">
        <h2>My Patients</h2>
        <p>Bạn cần <Link to="/login">đăng nhập</Link> với tài khoản bác sĩ để xem danh sách bệnh nhân.</p>
      </div>
    );
  }

  // Detail panel for a single patient (uses inline section instead of full modal)
  if (selectedPatient) {
    const apptsForPatient = appts
      .filter(a => a.patientId === selectedPatient.id)
      .sort((a, b) => (b.scheduledAt || '').localeCompare(a.scheduledAt || ''));
    return (
      <>
        <div className="card">
          <button className="secondary" onClick={closePatient}>← Back to patient list</button>
        </div>

        <div className="card">
          <div className="profile-header">
            <div className="profile-avatar">
              {(selectedPatient.name || '?').split(/\s+/).map(p => p[0]).filter(Boolean).slice(0,2).join('').toUpperCase()}
            </div>
            <div className="profile-meta">
              <h2>{selectedPatient.name || `Patient #${selectedPatient.id}`}</h2>
              <div className="handle">Patient ID #{selectedPatient.id}</div>
              <span className="role-pill">Patient</span>
            </div>
          </div>
        </div>

        <div className="dash-stats">
          <div className="stat-card accent-indigo">
            <div className="stat-num">{apptsForPatient.length}</div>
            <div className="stat-lbl">Appointments</div>
          </div>
          <div className="stat-card accent-teal">
            <div className="stat-num">{patientRecs.length}</div>
            <div className="stat-lbl">Records</div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-num">{apptsForPatient.filter(a => a.status === 'booked').length}</div>
            <div className="stat-lbl">Upcoming</div>
          </div>
          <div className="stat-card accent-pink">
            <div className="stat-num">{apptsForPatient.filter(a => a.status === 'done').length}</div>
            <div className="stat-lbl">Completed</div>
          </div>
        </div>

        <div className="card">
          <div className="dash-section-head"><h3>Appointments</h3></div>
          {apptsForPatient.length === 0 ? (
            <div className="empty-state">No appointments.</div>
          ) : (
            <table>
              <thead><tr><th>Date</th><th>Reason</th><th>Status</th></tr></thead>
              <tbody>
                {apptsForPatient.map(a => (
                  <tr key={a.id}>
                    <td>{a.scheduledAt}</td>
                    <td>{a.reason}</td>
                    <td><span className={`badge ${a.status}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="dash-section-head">
            <h3>Medical records</h3>
            <Link to="/doctor/write-record">+ Write new record</Link>
          </div>
          {patientRecs.length === 0 ? (
            <div className="empty-state">No records yet.</div>
          ) : (
            <table>
              <thead><tr><th>ID</th><th>Date</th><th>Doctor</th><th>Diagnosis</th><th></th></tr></thead>
              <tbody>
                {patientRecs.map(r => (
                  <tr key={r.id}>
                    <td>#{r.id}</td>
                    <td>{r.createdAt}</td>
                    <td>{r.doctorName}</td>
                    <td>{r.diagnosis}</td>
                    <td><button className="secondary" onClick={() => openRecord(r.id)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {(recDetail || recDetailErr) && (
          <div className="modal-backdrop" onClick={closeRecord}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Record {recDetail ? `#${recDetail.id}` : ''}</h3>
                <button className="modal-close" onClick={closeRecord}>×</button>
              </div>
              <div className="modal-body">
                {recDetailErr && <div className="error">{recDetailErr}</div>}
                {recDetail && (
                  <dl className="detail-grid">
                    <dt>Patient</dt><dd>{recDetail.patientName} {recDetail.patientDob && `(DOB: ${recDetail.patientDob})`}</dd>
                    <dt>Doctor</dt><dd>{recDetail.doctorName}</dd>
                    <dt>Created</dt><dd>{recDetail.createdAt}</dd>
                    <dt>Diagnosis</dt><dd dangerouslySetInnerHTML={{__html: recDetail.diagnosis || '—'}} />
                    <dt>Prescription</dt><dd dangerouslySetInnerHTML={{__html: recDetail.prescription || '—'}} />
                    <dt>Notes</dt><dd dangerouslySetInnerHTML={{__html: recDetail.notes || '—'}} />
                    {recDetail.attachmentPath && <><dt>Attachment</dt><dd><a href={recDetail.attachmentPath} target="_blank">Open</a></dd></>}
                  </dl>
                )}
              </div>
              <div className="modal-footer">
                <button className="secondary" onClick={closeRecord}>Close</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Patient list view
  return (
    <>
      <div className="card">
        <div className="dash-welcome">
          <div>
            <h2>My Patients</h2>
            <p style={{margin:0}}>Patients you have appointments or records with.</p>
          </div>
          <div className="profile-actions">
            <Link to="/doctor/write-record"><button>+ Write record</button></Link>
            <Link to="/doctor"><button className="secondary">Back to dashboard</button></Link>
          </div>
        </div>
      </div>

      {err && <div className="error">{err}</div>}

      <div className="dash-stats">
        <div className="stat-card accent-indigo">
          <div className="stat-num">{patients.length}</div>
          <div className="stat-lbl">Total patients</div>
        </div>
        <div className="stat-card accent-amber">
          <div className="stat-num">{appts.length}</div>
          <div className="stat-lbl">Appointments</div>
        </div>
        <div className="stat-card accent-teal">
          <div className="stat-num">{records.length}</div>
          <div className="stat-lbl">Records authored</div>
        </div>
        <div className="stat-card accent-pink">
          <div className="stat-num">{appts.filter(a => a.status === 'booked').length}</div>
          <div className="stat-lbl">Upcoming visits</div>
        </div>
      </div>

      <div className="card">
        <div className="dash-section-head">
          <h3>Patient directory</h3>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search by name or ID"
            style={{maxWidth: 240}}
          />
        </div>
        {patients.length === 0 ? (
          <div className="empty-state">No patients yet — book an appointment first.</div>
        ) : (
          <table>
            <thead>
              <tr><th>ID</th><th>Name</th><th>Visits</th><th>Records</th><th>Last visit</th><th></th></tr>
            </thead>
            <tbody>
              {patients.map(p => (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td>{p.name || `Patient #${p.id}`}</td>
                  <td>{p.appts}</td>
                  <td>{p.records}</td>
                  <td>{p.last || '—'}</td>
                  <td><button className="secondary" onClick={() => openPatient(p)}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="dash-section-head">
          <h3>Quick lookup by record ID</h3>
        </div>
        <div style={{display:'flex', gap:10, alignItems:'flex-end', flexWrap:'wrap'}}>
          <input
            value={lookupId}
            onChange={e => setLookupId(e.target.value)}
            placeholder="record id"
            style={{maxWidth: 200}}
          />
          <button onClick={lookup}>Load</button>
        </div>
        {lookupErr && <div className="error" style={{marginTop:12}}>{lookupErr}</div>}
        {lookupRec && (
          <div style={{ marginTop: 16 }}>
            <h4>Record #{lookupRec.id} — {lookupRec.patientName}</h4>
            <dl className="detail-grid">
              <dt>Doctor</dt><dd>{lookupRec.doctorName}</dd>
              <dt>Created</dt><dd>{lookupRec.createdAt}</dd>
              <dt>Diagnosis</dt><dd dangerouslySetInnerHTML={{__html: lookupRec.diagnosis || '—'}} />
              <dt>Prescription</dt><dd dangerouslySetInnerHTML={{__html: lookupRec.prescription || '—'}} />
              <dt>Notes</dt><dd dangerouslySetInnerHTML={{__html: lookupRec.notes || '—'}} />
            </dl>
          </div>
        )}
      </div>
    </>
  );
}
