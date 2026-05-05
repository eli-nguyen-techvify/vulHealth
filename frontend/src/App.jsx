import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { currentUser } from './api';
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
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import Diagnostics from './pages/admin/Diagnostics';
import ImportXml from './pages/admin/ImportXml';

function Layout({ children }) {
  const loc = useLocation();
  const isAdmin = loc.pathname.startsWith('/admin');
  const fullBleed = loc.pathname === '/' || isAdmin; // Landing + admin handle their own width
  if (fullBleed) return children;
  return <div className="container">{children}</div>;
}

function ConditionalNavbar() {
  const loc = useLocation();
  if (loc.pathname.startsWith('/admin')) return null;
  return <Navbar />;
}

function HomeRoute() {
  const user = currentUser();
  if (user?.role === 'admin')        return <Navigate to="/admin" replace />;
  if (user?.role === 'doctor')       return <Navigate to="/doctor" replace />;
  if (user?.role === 'receptionist') return <Navigate to="/appointments" replace />;
  return <Landing />;
}

export default function App() {
  return (
    <>
      <ConditionalNavbar />
      <Layout>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
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
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="diagnostics" element={<Diagnostics />} />
            <Route path="import" element={<ImportXml />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </>
  );
}
