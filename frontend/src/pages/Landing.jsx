import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { currentUser } from '../api';

export default function Landing() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [depts, setDepts] = useState([]);
  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState(q);
  const me = currentUser();

  useEffect(() => {
    api.get('/departments').then((r) => setDepts(r.data)).catch(() => {});
    api.get('/doctors').then((r) => setDocs((r.data.doctors || []).slice(0, 6))).catch(() => {});
  }, []);

  function doSearch(e) {
    e.preventDefault();
    nav(`/search?q=${encodeURIComponent(search)}`);
  }

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <div>
            <h1>Your health,<br/>our priority.</h1>
            <p className="lead">
              Book appointments with top-rated doctors across 6 departments, chat with your provider,
              and keep your medical history in one place.
            </p>
            <form onSubmit={doSearch} className="search-hero">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search doctors, specialties…"
              />
              <button>Search</button>
            </form>
            {/* VULN: reflected XSS — raw q rendered as HTML */}
            {q && <p style={{marginTop:16}}>Results for: <span dangerouslySetInnerHTML={{ __html: q }} /></p>}
            <div style={{marginTop:20}}>
              {me ? (
                <>
                  <Link to="/book"><button>Book appointment →</button></Link>
                  {' '}
                  <Link to="/records"><button className="secondary">My records</button></Link>
                </>
              ) : (
                <>
                  <Link to="/register"><button>Get started</button></Link>
                  {' '}
                  <Link to="/login"><button className="secondary">Log in</button></Link>
                </>
              )}
            </div>
          </div>
          <div className="blob" aria-hidden />
        </div>
      </section>

      <div className="container">
        {/* STATS */}
        <div className="stats">
          <div className="stat"><div className="num">10</div><div className="lbl">Expert doctors</div></div>
          <div className="stat"><div className="num">6</div><div className="lbl">Departments</div></div>
          <div className="stat"><div className="num">500+</div><div className="lbl">Patients served</div></div>
        </div>
      </div>

      {/* 3-col features on yellow */}
      <section className="section yellow">
        <div className="inner">
          <h2 style={{textAlign:'center', marginBottom:36}}>How VulHealth works</h2>
          <div className="features">
            <div className="feature">
              <span className="emoji">🩺</span>
              <h3>Find a doctor</h3>
              <p>Browse our directory by specialty or read patient reviews.</p>
            </div>
            <div className="feature">
              <span className="emoji">📅</span>
              <h3>Book in seconds</h3>
              <p>Pick a time that works for you — no phone calls, no waiting rooms.</p>
            </div>
            <div className="feature">
              <span className="emoji">💬</span>
              <h3>Stay connected</h3>
              <p>Message your doctor and access your records 24/7 from any device.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Departments on pink */}
      <section className="section pink">
        <div className="inner">
          <h2 style={{textAlign:'center', marginBottom:36}}>Our departments</h2>
          <div className="grid">
            {depts.map((d) => (
              <div className="doctor-card" key={d.id}>
                <h3>{d.name}</h3>
                <p><small>{d.description}</small></p>
                <p><strong>Head:</strong> {d.headDoctorName || 'TBD'}</p>
                <Link to={`/doctors?departmentId=${d.id}`}>Browse doctors →</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Doctors on blue */}
      <section className="section blue">
        <div className="inner">
          <h2 style={{textAlign:'center', marginBottom:36}}>Meet our doctors</h2>
          <div className="grid">
            {docs.map((d) => (
              <div className="doctor-card" key={d.id}>
                <h3>{d.fullName}</h3>
                <p><small>@{d.username}</small></p>
                <p>📞 {d.phone}</p>
                <Link to={`/doctors/${d.id}`}>View profile →</Link>
              </div>
            ))}
          </div>
          <div style={{textAlign:'center', marginTop:30}}>
            <Link to="/doctors"><button>See all doctors</button></Link>
          </div>
        </div>
      </section>

      {/* FAQ on lilac */}
      <section className="section lilac">
        <div className="inner" style={{maxWidth:780}}>
          <h2 style={{textAlign:'center', marginBottom:36}}>Questions we get asked a lot…</h2>
          <details>
            <summary>How do I book an appointment?</summary>
            <div className="answer">After creating an account, browse doctors, pick a time slot, and confirm. You'll get a confirmation instantly and a reminder message from your doctor.</div>
          </details>
          <details>
            <summary>Is my medical data secure?</summary>
            <div className="answer">We take security very seriously. We use industry-standard encryption and access controls. <em>(Editor's note: this is a vulnerable-by-design training app. Do not use real data.)</em></div>
          </details>
          <details>
            <summary>Can I message my doctor directly?</summary>
            <div className="answer">Yes — once you have an appointment, you can use our secure messaging to ask follow-up questions or clarify prescriptions.</div>
          </details>
          <details>
            <summary>What if I need to cancel?</summary>
            <div className="answer">You can cancel up to 2 hours before your slot from the "My Appointments" page. No penalty.</div>
          </details>
          <details>
            <summary>Do you accept insurance?</summary>
            <div className="answer">We currently bill self-pay at the time of booking. Insurance integration is coming soon.</div>
          </details>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="inner">
          <div className="brand">
            <h3>🏥 VulHealth</h3>
            <p>A modern hospital portal for patients, doctors, and administrators. Built for training and security research.</p>
          </div>
          <div>
            <h4>Product</h4>
            <ul>
              <li><Link to="/doctors">Find doctors</Link></li>
              <li><Link to="/book">Book appointment</Link></li>
              <li><Link to="/records">My records</Link></li>
              <li><Link to="/messages">Messages</Link></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><a href="#">About</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Press</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Privacy</a></li>
              <li><a href="#">Terms</a></li>
              <li><a href="#">HIPAA notice</a></li>
              <li><a href="/api-docs">API docs</a></li>
            </ul>
          </div>
        </div>
        <div className="legal">
          <span>© 2026 VulHealth. For training use only.</span>
          <span>v1.0.0 · <code>NOT FOR PRODUCTION</code></span>
        </div>
      </footer>
    </>
  );
}
