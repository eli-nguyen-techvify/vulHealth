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
            <h1>Trusted care,<br/>built around you.</h1>
            <p className="lead">
              Connect with specialists across six departments. Book in seconds, message your doctor,
              and keep your medical history in one calm, secure place.
            </p>
            <form onSubmit={doSearch} className="search-hero">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search doctors, specialties…"
              />
              <button>Search</button>
            </form>
            {q && <p style={{marginTop:16}}>Results for: <span dangerouslySetInnerHTML={{ __html: q }} /></p>}
            <div className="cta-row" style={{marginTop:24}}>
              {me ? (
                <>
                  <Link to="/book"><button>Book appointment</button></Link>
                  <Link to="/records"><button className="secondary">My records</button></Link>
                </>
              ) : (
                <>
                  <Link to="/register"><button>Get started</button></Link>
                  <Link to="/login"><button className="secondary">Log in</button></Link>
                </>
              )}
            </div>
          </div>
          <div className="illus">
            <div className="illus-emoji">
              <img src="https://api.iconify.design/ph/stethoscope-duotone.svg?color=%234338ca&width=340" alt="" />
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="section tint">
        <div className="inner">
          <div className="stats">
            <div className="stat"><div className="num">10</div><div className="lbl">Specialists on staff</div></div>
            <div className="stat"><div className="num">6</div><div className="lbl">Departments</div></div>
            <div className="stat"><div className="num">500+</div><div className="lbl">Patients served</div></div>
          </div>
        </div>
      </section>

      {/* Split: the problem we solve */}
      <section className="section white">
        <div className="inner">
          <div className="split">
            <div>
              <h2>You shouldn't have to chase down your care.</h2>
              <ul className="bullets">
                <li>Clinics don't share records.</li>
                <li>Booking takes days of phone tag.</li>
                <li>Your doctor is hard to reach after the visit.</li>
                <li>Test results disappear into email threads.</li>
                <li>Nothing feels built for you.</li>
              </ul>
            </div>
            <div className="illus-side">
              <img src="https://api.iconify.design/ph/calendar-x-duotone.svg?color=%234338ca&width=220" alt="" />
            </div>
          </div>
        </div>
      </section>

      {/* Split reverse: what we do */}
      <section className="section off">
        <div className="inner">
          <div className="split reverse">
            <div>
              <h2>One calm portal. Every part of your care.</h2>
              <ul className="bullets">
                <li>A single directory of vetted specialists.</li>
                <li>Real-time appointment slots — no phone required.</li>
                <li>Secure messaging with your provider.</li>
                <li>Complete medical history at your fingertips.</li>
              </ul>
            </div>
            <div className="illus-side">
              <img src="https://api.iconify.design/ph/heartbeat-duotone.svg?color=%234338ca&width=220" alt="" />
            </div>
          </div>
        </div>
      </section>

      {/* 3-col features */}
      <section className="section white sprinkle">
        <div className="inner">
          <h2 style={{textAlign:'center', marginBottom:44}}>How VulHealth works</h2>
          <div className="features">
            <div className="feature">
              <div className="emoji">
                <img src="https://api.iconify.design/ph/magnifying-glass-duotone.svg?color=%234338ca&width=32" alt="" />
              </div>
              <h3>Find a doctor</h3>
              <p>Browse our directory by specialty, department, or name.</p>
            </div>
            <div className="feature">
              <div className="emoji">
                <img src="https://api.iconify.design/ph/calendar-check-duotone.svg?color=%234338ca&width=32" alt="" />
              </div>
              <h3>Book in seconds</h3>
              <p>Pick a time that works for you. No phone calls, no waiting rooms.</p>
            </div>
            <div className="feature">
              <div className="emoji">
                <img src="https://api.iconify.design/ph/chat-circle-dots-duotone.svg?color=%234338ca&width=32" alt="" />
              </div>
              <h3>Stay connected</h3>
              <p>Message your doctor and access records 24/7 from any device.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Departments */}
      <section className="section tint">
        <div className="inner">
          <h2 style={{textAlign:'center', marginBottom:44}}>Our departments</h2>
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

      {/* Doctors */}
      <section className="section white">
        <div className="inner">
          <h2 style={{textAlign:'center', marginBottom:44}}>Meet our specialists</h2>
          <div className="grid">
            {docs.map((d) => (
              <div className="doctor-card" key={d.id}>
                <h3>{d.fullName}</h3>
                <p><small>@{d.username}</small></p>
                <p style={{display:'flex',alignItems:'center',gap:6}}>
                  <img src="https://api.iconify.design/ph/phone-duotone.svg?color=%234338ca&width=16" alt="" />
                  {d.phone}
                </p>
                <Link to={`/doctors/${d.id}`}>View profile →</Link>
              </div>
            ))}
          </div>
          <div style={{textAlign:'center', marginTop:36}}>
            <Link to="/doctors"><button>See all doctors</button></Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section off">
        <div className="inner" style={{maxWidth:760}}>
          <h2 style={{textAlign:'center', marginBottom:36}}>Frequently asked</h2>
          <details>
            <summary>How do I book an appointment?</summary>
            <div className="answer">After creating an account, browse doctors, pick a time slot, and confirm. You'll get a confirmation instantly.</div>
          </details>
          <details>
            <summary>Is my medical data secure?</summary>
            <div className="answer">We take security seriously. We use industry-standard encryption and access controls. <em>(Editor's note: this is a vulnerable-by-design training app. Do not use real data.)</em></div>
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

      {/* CTA */}
      <section className="section white">
        <div className="inner" style={{textAlign:'center', maxWidth:640}}>
          <h2>Care that finally feels calm.</h2>
          <p style={{fontSize:17, color:'var(--ink-soft)', marginBottom:28}}>Join hundreds of patients who trust VulHealth for their everyday care.</p>
          {!me && <Link to="/register"><button>Get started</button></Link>}
          {me  && <Link to="/book"><button>Book your next visit</button></Link>}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="inner">
          <div className="brand">
            <span className="logo">V</span>
            <span>VulHealth</span>
          </div>
          <ul>
            <li><Link to="/doctors">Find doctors</Link></li>
            <li><Link to="/book">Book</Link></li>
            <li><Link to="/records">Records</Link></li>
            <li><Link to="/messages">Messages</Link></li>
            <li><a href="/api-docs">API docs</a></li>
          </ul>
          <div className="spacer" />
          <div className="legal">© 2026 VulHealth · For training use only</div>
        </div>
      </footer>
    </>
  );
}
