import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { currentUser, logout } from '../../api';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const user = currentUser();
  const nav = useNavigate();
  const onLogout = () => { logout(); nav('/login'); };

  return (
    <div className={`admin-shell ${collapsed ? 'collapsed' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <button className="hamburger" onClick={() => setCollapsed(c => !c)} aria-label="Toggle sidebar">≡</button>
          <span className="brand-text">VulHealth Admin</span>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin" end>
            <span className="icon">D</span><span className="label">Dashboard</span>
          </NavLink>
          <NavLink to="/admin/users">
            <span className="icon">U</span><span className="label">User Management</span>
          </NavLink>
          <NavLink to="/admin/diagnostics">
            <span className="icon">S</span><span className="label">Server Diagnostics</span>
          </NavLink>
          <NavLink to="/admin/import">
            <span className="icon">I</span><span className="label">Import XML</span>
          </NavLink>
          <a href="/api-docs" target="_blank" rel="noreferrer">
            <span className="icon">A</span><span className="label">API Docs ↗</span>
          </a>
        </nav>

        <div className="admin-foot">
          {user && (
            <div className="admin-user">
              <strong>{user.fullName || user.username}</strong>
              <small> ({user.role})</small>
            </div>
          )}
          <Link to="/" className="back-link">← Back to site</Link>
          <button className="secondary" onClick={onLogout}>Logout</button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
