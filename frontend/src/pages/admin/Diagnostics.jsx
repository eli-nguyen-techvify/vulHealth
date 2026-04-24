import React, { useState } from 'react';
import api from '../../api';

export default function Diagnostics() {
  const [host, setHost] = useState('127.0.0.1');
  const [result, setResult] = useState(null);
  const [logFile, setLogFile] = useState('app.log');
  const [logContent, setLogContent] = useState('');
  const [err, setErr] = useState('');

  async function ping() {
    setErr(''); setResult(null);
    try {
      const { data } = await api.post('/admin/ping', { host });
      setResult(data);
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  }

  async function readLog() {
    setErr(''); setLogContent('');
    try {
      const { data } = await api.get('/admin/logs', { params: { file: logFile }, responseType: 'text' });
      setLogContent(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  }

  return (
    <>
      <div className="card">
        <h2>Ping Diagnostic</h2>
        <input value={host} onChange={e=>setHost(e.target.value)} placeholder="host" style={{maxWidth:400}} />
        <button onClick={ping} style={{marginLeft:8}}>Ping</button>
        {err && <div className="error">{err}</div>}
        {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
      </div>

      <div className="card">
        <h2>View Server Logs</h2>
        <input value={logFile} onChange={e=>setLogFile(e.target.value)} placeholder="app.log" style={{maxWidth:400}} />
        <button onClick={readLog} style={{marginLeft:8}}>Read</button>
        {logContent && <pre>{logContent}</pre>}
      </div>
    </>
  );
}
