import React from 'react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  return (
    <div className="card">
      <h2>Admin Control Panel</h2>
      <ul>
        <li><Link to="/admin/users">User Management</Link> — list, promote, change role</li>
        <li><Link to="/admin/diagnostics">Server Diagnostics</Link> — ping hosts</li>
        <li><Link to="/admin/import">Import Departments XML</Link> — from URL</li>
        <li><a href="/api-docs" target="_blank">Swagger API Docs</a></li>
      </ul>
    </div>
  );
}
