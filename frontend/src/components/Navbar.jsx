import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { currentUser, logout } from '../api';

export default function Navbar() {
  const user = currentUser();
  const nav = useNavigate();
  const onLogout = () => { logout(); nav('/login'); };

  return (
    <nav className="navbar">
      <strong>🏥 VulHealth</strong>
      <Link to="/">Home</Link>
      <Link to="/doctors">Doctors</Link>
      {user && <Link to="/appointments">Appointments</Link>}
      {user && <Link to="/records">Records</Link>}
      {user && <Link to="/messages">Messages</Link>}
      {user?.role === 'doctor' && <Link to="/doctor">Doctor Panel</Link>}
      {user?.role === 'admin'  && <Link to="/admin">Admin</Link>}
      <div className="spacer" />
      {user ? (
        <>
          <Link to="/profile" className="user">{user.fullName || user.username} ({user.role})</Link>
          <button className="secondary" onClick={onLogout}>Logout</button>
        </>
      ) : (
        <>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </>
      )}
    </nav>
  );
}
