import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';

export default function Messages() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState('inbox');
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [selected, setSelected] = useState(null);
  const [toUserId, setToUserId] = useState(params.get('to') || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');

  async function load() {
    try {
      const [a, b] = await Promise.all([api.get('/messages/inbox'), api.get('/messages/sent')]);
      setInbox(a.data); setSent(b.data);
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  }
  useEffect(() => { load(); }, []);

  async function send(e) {
    e.preventDefault();
    setErr(''); setOk('');
    try {
      await api.post('/messages', { toUserId: Number(toUserId), subject, body });
      setOk('Message sent');
      setSubject(''); setBody('');
      load();
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  }

  const list = tab === 'inbox' ? inbox : sent;

  return (
    <div className="split-2">
      <div className="card">
        <h3>Compose</h3>
        <form onSubmit={send}>
          <label><span>To (user id)</span><input value={toUserId} onChange={e=>setToUserId(e.target.value)} required /></label>
          <label><span>Subject</span><input value={subject} onChange={e=>setSubject(e.target.value)} /></label>
          <label><span>Body</span><textarea value={body} onChange={e=>setBody(e.target.value)} required /></label>
          {err && <div className="error">{err}</div>}
          {ok  && <div className="ok">{ok}</div>}
          <button>Send</button>
        </form>
      </div>

      <div className="card">
        <h3>Messages</h3>
        <div style={{ marginBottom: 10 }}>
          <button className={tab==='inbox'?'':'secondary'} onClick={() => { setTab('inbox'); setSelected(null); }}>Inbox</button>{' '}
          <button className={tab==='sent'?'':'secondary'} onClick={() => { setTab('sent'); setSelected(null); }}>Sent</button>
        </div>
        {selected ? (
          <div>
            <button className="secondary" onClick={() => setSelected(null)}>← Back</button>
            <h4>{selected.subject || '(no subject)'}</h4>
            <p><small>From: {selected.fromName || selected.fromUsername} · {selected.createdAt}</small></p>
            <div style={{ whiteSpace: 'pre-wrap' }}>{selected.body}</div>
          </div>
        ) : (
          <table>
            <thead><tr><th>From/To</th><th>Subject</th><th>When</th></tr></thead>
            <tbody>
              {list.map(m => (
                <tr key={m.id} style={{cursor:'pointer'}} onClick={() => setSelected(m)}>
                  <td>{m.fromName || m.toName || m.fromUsername || m.toUsername}</td>
                  <td>{m.subject || '(no subject)'}</td>
                  <td><small>{m.createdAt}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
