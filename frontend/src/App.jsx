import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Doctors from './pages/Doctors';
import DoctorDetail from './pages/DoctorDetail';
import BookAppointment from './pages/BookAppointment';
import MyAppointments from './pages/MyAppointments';
import MyRecords from './pages/MyRecords';
import RecordDetail from './pages/RecordDetail';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import Search from './pages/Search';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import PatientRecords from './pages/doctor/PatientRecords';
import WriteRecord from './pages/doctor/WriteRecord';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import Diagnostics from './pages/admin/Diagnostics';
import ImportXml from './pages/admin/ImportXml';

function Layout({ children }) {
  const loc = useLocation();
  const fullBleed = loc.pathname === '/';   // only Landing wants full-bleed hero
  if (fullBleed) return children;
  return <div className="container">{children}</div>;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/doctors/:id" element={<DoctorDetail />} />
          <Route path="/book" element={<BookAppointment />} />
          <Route path="/appointments" element={<MyAppointments />} />
          <Route path="/records" element={<MyRecords />} />
          <Route path="/records/:id" element={<RecordDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/search" element={<Search />} />
          <Route path="/doctor" element={<DoctorDashboard />} />
          <Route path="/doctor/patients" element={<PatientRecords />} />
          <Route path="/doctor/write-record" element={<WriteRecord />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/diagnostics" element={<Diagnostics />} />
          <Route path="/admin/import" element={<ImportXml />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </>
  );
}
