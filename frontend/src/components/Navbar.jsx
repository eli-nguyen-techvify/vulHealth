import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { currentUser, logout } from '../api';

export default function Navbar() {
  const user = currentUser();
  const nav = useNavigate();
  const onLogout = () => { logout(); nav('/login'); };
  const role = user?.role;

  // Nav items vary by role:
  //  - guest / patient → Home, Doctors, Appointments, Records (+ Messages for patient)
  //  - doctor          → Doctor Panel, Appointments, My Patients, Messages
  //  - receptionist    → Appointments, Doctors, Messages
  //  - admin           → Admin (navbar mostly hidden under /admin paths)
  let links = null;
  if (role === 'doctor') {
    links = (
      <>
        <Link to="/doctor">Doctor Panel</Link>
        <Link to="/appointments">Appointments</Link>
        <Link to="/doctor/patients">Patients</Link>
        <Link to="/doctor/write-record">Write record</Link>
        <Link to="/messages">Messages</Link>
      </>
    );
  } else if (role === 'receptionist') {
    links = (
      <>
        <Link to="/appointments">Appointments</Link>
        <Link to="/doctors">Doctors</Link>
        <Link to="/messages">Messages</Link>
      </>
    );
  } else if (role === 'admin') {
    links = (
      <>
        <Link to="/admin">Admin</Link>
        <Link to="/messages">Messages</Link>
      </>
    );
  } else {
    // guest or patient — only these two see Home
    links = (
      <>
        <Link to="/">Home</Link>
        <Link to="/doctors">Doctors</Link>
        <Link to="/appointments">Appointments</Link>
        <Link to="/records">Records</Link>
        {user && <Link to="/messages">Messages</Link>}
      </>
    );
  }

  return (
    <nav className="navbar">
      <strong style={{display:'inline-flex',alignItems:'center',gap:8}}>
        <img src="https://api.iconify.design/ph/hospital-duotone.svg?color=%234338ca&width=24" alt="" />
        VulHealth
      </strong>
      {links}
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
