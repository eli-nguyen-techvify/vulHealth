import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api';

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [docs, setDocs] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/doctors', { params: { q } })
      .then(r => setDocs(r.data.doctors))
      .catch(e => setErr(e.response?.data?.error || e.message));
  }, [q]);

  return (
    <div className="card">
      {/* VULN: reflected XSS via dangerouslySetInnerHTML */}
      <h2>Results for: <span dangerouslySetInnerHTML={{ __html: q }} /></h2>
      {err && <div className="error">{err}</div>}
      <ul>
        {docs.map(d => <li key={d.id}><Link to={`/doctors/${d.id}`}>{d.fullName}</Link></li>)}
      </ul>
      {!docs.length && <p>No matches.</p>}
    </div>
  );
}
