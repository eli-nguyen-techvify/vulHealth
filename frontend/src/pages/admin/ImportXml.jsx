import React, { useState } from 'react';
import api from '../../api';

export default function ImportXml() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  async function fetchIt() {
    setErr(''); setResult(null);
    try {
      const { data } = await api.post('/admin/import/departments', { url });
      setResult(data);
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  }

  return (
    <div className="card">
      <h2>Import Departments from URL</h2>
      <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="http://example.com/departments.xml" style={{maxWidth:500}} />
      <button onClick={fetchIt} style={{marginLeft:8}}>Fetch</button>
      {err && <div className="error">{err}</div>}
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
