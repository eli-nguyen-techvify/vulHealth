import React, { useEffect, useState } from 'react';
import api, { currentUser, setAuth } from '../api';

export default function Profile() {
  const [me, setMe] = useState(null);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [passwordNew, setPasswordNew] = useState('');
  const [fetchResult, setSsrfResult] = useState(null);

  useEffect(() => {
    api.get('/users/me').then(r => setMe(r.data)).catch(e => setErr(e.response?.data?.error || e.message));
  }, []);

  async function save(e) {
    e.preventDefault();
    setErr(''); setOk('');
    try {
      const { data } = await api.put('/users/me', me);
      setMe(data);
      setAuth(localStorage.getItem('token'), data);
      setOk('Profile saved.');
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  }

  async function uploadAvatar(e) {
    const f = e.target.files[0];
    if (!f) return;
    const fd = new FormData();
    fd.append('file', f);
    fd.append('filename', f.name);
    try {
      const { data } = await api.post('/upload/avatar', fd);
      setMe({ ...me, avatarUrl: data.served });
      setOk('Avatar uploaded to ' + data.served);
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  }

  async function fetchAvatar() {
    setErr(''); setSsrfResult(null);
    try {
      const { data } = await api.post('/users/me/avatar-from-url', { url: avatarUrl });
      setSsrfResult(data);
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  }

  async function changePassword() {
    setErr(''); setOk('');
    try {
      await api.post('/users/me/change-password', { newPassword: passwordNew });
      setOk('Password changed.');
      setPasswordNew('');
    } catch (e) { setErr(e.response?.data?.error || e.message); }
  }

  if (!me) return <p>Loading…</p>;
  const upd = (k) => (e) => setMe({ ...me, [k]: e.target.value });

  return (
    <>
      <div className="card">
        <h2>My Profile</h2>
        {err && <div className="error">{err}</div>}
        {ok  && <div className="ok">{ok}</div>}
        <form onSubmit={save}>
          <label><span>Username</span><input value={me.username||''} onChange={upd('username')} /></label>
          <label><span>Email</span><input value={me.email||''} onChange={upd('email')} /></label>
          <label><span>Full name</span><input value={me.fullName||''} onChange={upd('fullName')} /></label>
          <label><span>Phone</span><input value={me.phone||''} onChange={upd('phone')} /></label>
          <label><span>Bio</span><textarea value={me.bio||''} onChange={upd('bio')} /></label>
          <label><small>Role: {me.role}</small></label>
          <button>Save</button>
        </form>
      </div>

      <div className="card">
        <h3>Avatar</h3>
        {me.avatarUrl && <img src={me.avatarUrl} alt="avatar" style={{ maxWidth: 120, border:'1px solid #ccc' }} />}
        <p><input type="file" onChange={uploadAvatar} /></p>
        <hr/>
        <h4>Or fetch from URL</h4>
        <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://example.com/pic.jpg" />
        <button onClick={fetchAvatar} style={{marginTop:8}}>Fetch</button>
        {fetchResult && (
          <pre>{JSON.stringify(fetchResult, null, 2)}</pre>
        )}
      </div>

      <div className="card">
        <h3>Change Password</h3>
        <input type="password" value={passwordNew} onChange={e => setPasswordNew(e.target.value)} placeholder="new password" />
        <button onClick={changePassword} style={{marginTop:8}}>Change</button>
      </div>
    </>
  );
}
