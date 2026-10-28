import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import PatientView from './components/PatientView';
import DoctorView from './components/DoctorView';
import AdminView from './components/AdminView';
import AuthModal from './components/AuthModal';
import Toast from './components/Toast';
import CityMap from './components/CityMap';
import {
  ShieldAlert,
  Calendar,
  Activity,
  Ambulance,
  Stethoscope,
  Users,
  LogIn,
  UserPlus,
  ArrowRight,
  Zap,
  MapPin
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('resq_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Global Datasets
  const [stats, setStats] = useState(null);
  const [cities, setCities] = useState([]);
  const [roads, setRoads] = useState({});
  const [doctors, setDoctors] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);

  // Auth Modal State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  // Notifications
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback(({ type = 'info', title, message }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch all live data from backend bridge
  const fetchData = useCallback(async () => {
    try {
      // 1. Stats
      const statsRes = await fetch('/api/stats');
      if (statsRes.ok) setStats(await statsRes.json());

      // 2. Cities
      const citiesRes = await fetch('/api/cities');
      if (citiesRes.ok) {
        const cData = await citiesRes.json();
        setCities(cData.cities || []);
        setRoads(cData.roads || {});
      }

      // 3. Doctors
      const docsRes = await fetch('/api/doctors');
      if (docsRes.ok) {
        const dData = await docsRes.json();
        setDoctors(dData.doctors || []);
      }

      // 4. Ambulances
      const ambRes = await fetch('/api/ambulances');
      if (ambRes.ok) {
        const aData = await ambRes.json();
        setAmbulances(aData.ambulances || []);
      }

      // 5. Emergencies
      const emgRes = await fetch('/api/emergencies');
      if (emgRes.ok) {
        const eData = await emgRes.json();
        setEmergencies(eData.emergencies || []);
      }

      // 6. Appointments
      const apptRes = await fetch('/api/appointments');
      if (apptRes.ok) {
        const apData = await apptRes.json();
        setAppointments(apData.appointments || []);
      }

      // 7. Patients (admin only)
      if (currentUser?.role === 'ADMIN') {
        const ptsRes = await fetch('/api/patients');
        if (ptsRes.ok) {
          const pData = await ptsRes.json();
          setPatients(pData.patients || []);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
    // Poll data every 4 seconds for real-time synchronization with C++ backend
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle Login Success
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('resq_user', JSON.stringify(user));
    showToast({
      type: 'success',
      title: `Welcome, ${user.name}!`,
      message: `Signed in as ${user.role} (${user.id})`
    });
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('resq_user');
    showToast({
      type: 'info',
      title: 'Logged Out',
      message: 'You have safely signed out of RESQ.'
    });
  };

  // Quick Demo Login
  const handleQuickLogin = async (username, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Quick login failed');
      handleLoginSuccess(data.user);
    } catch (err) {
      showToast({ type: 'error', title: 'Quick Switch Failed', message: err.message });
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenLogin={() => { setAuthMode('login'); setIsAuthOpen(true); }}
        onOpenRegister={() => { setAuthMode('register'); setIsAuthOpen(true); }}
        onQuickLogin={handleQuickLogin}
      />

      {/* Main Content Body */}
      <main style={{ flex: 1 }}>
        {currentUser ? (
          currentUser.role === 'ADMIN' ? (
            <AdminView
              stats={stats}
              emergencies={emergencies}
              ambulances={ambulances}
              doctors={doctors}
              appointments={appointments}
              patients={patients}
              cities={cities}
              roads={roads}
              onRefresh={fetchData}
              showToast={showToast}
            />
          ) : currentUser.role === 'DOCTOR' ? (
            <DoctorView
              currentUser={currentUser}
              doctors={doctors}
              appointments={appointments}
              emergencies={emergencies}
              onRefresh={fetchData}
              showToast={showToast}
            />
          ) : (
            <PatientView
              currentUser={currentUser}
              cities={cities}
              doctors={doctors}
              appointments={appointments}
              emergencies={emergencies}
              onRefresh={fetchData}
              showToast={showToast}
            />
          )
        ) : (
          /* Public Hero & Demo Landing */
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
            {/* Hero Header */}
            <div style={{ textAlign: 'center', marginBottom: 44 }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 16px',
                borderRadius: 24,
                background: 'rgba(6, 182, 212, 0.1)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                color: '#67e8f9',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: 16
              }}>
                <Activity size={16} /> Intelligent Hospital Command & Dispatch Platform
              </div>
              <h1 style={{
                fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                marginBottom: 16
              }}>
                Instant Emergency Triage & <br />
                <span style={{
                  background: 'linear-gradient(90deg, #38bdf8 0%, #06b6d4 50%, #10b981 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Optimized Fleet Dispatch
                </span>
              </h1>
              <p style={{ maxWidth: 640, margin: '0 auto', color: 'var(--text-muted)', fontSize: '1.05rem' }}>
                Integrated with the C++ RESQ core algorithms. Calculates Dijkstra shortest path routing across 15 interconnected cities, priority queue emergency triage, and real-time medical scheduling.
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 28, flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }}
                  className="btn-primary"
                  style={{ padding: '12px 28px', fontSize: '1rem' }}
                >
                  <LogIn size={18} /> Access System Portal
                </button>
                <button
                  onClick={() => { setAuthMode('register'); setIsAuthOpen(true); }}
                  className="btn-secondary"
                  style={{ padding: '12px 24px', fontSize: '1rem' }}
                >
                  <UserPlus size={18} /> Register as Patient
                </button>
              </div>
            </div>

            {/* Quick Demo Access Profiles */}
            <div style={{ marginBottom: 44 }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Zap size={15} /> Instant One-Click Demo Personas
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                {/* 1. Admin Card */}
                <div
                  className="glass-panel"
                  onClick={() => handleQuickLogin('admin', 'admin123')}
                  style={{
                    padding: 22,
                    cursor: 'pointer',
                    borderLeft: '4px solid #ef4444'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f8fafc' }}>Administrator</span>
                    <span className="badge badge-critical">ADMIN</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                    Manage live priority dispatch queue, 10-ambulance fleet status, routing navigator, and doctors.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fca5a5', fontSize: '0.85rem', fontWeight: 700 }}>
                    Launch Admin Console <ArrowRight size={14} />
                  </div>
                </div>

                {/* 2. Doctor Card */}
                <div
                  className="glass-panel"
                  onClick={() => handleQuickLogin('dr.hart', 'Doc@1234')}
                  style={{
                    padding: 22,
                    cursor: 'pointer',
                    borderLeft: '4px solid #06b6d4'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f8fafc' }}>Dr. Aiden Hart</span>
                    <span className="badge badge-moderate">SPECIALIST</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                    Cardiology specialist. Review booked slots schedule, complete patient visits, and toggle duty status.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontSize: '0.85rem', fontWeight: 700 }}>
                    Launch Doctor Portal <ArrowRight size={14} />
                  </div>
                </div>

                {/* 3. Emergency Physician Card */}
                <div
                  className="glass-panel"
                  onClick={() => handleQuickLogin('dr.rivera', 'EP@1234')}
                  style={{
                    padding: 22,
                    cursor: 'pointer',
                    borderLeft: '4px solid #10b981'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f8fafc' }}>Dr. Alex Rivera</span>
                    <span className="badge badge-low">EP</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                    Emergency Physician assigned to ambulance trauma dispatches and rapid response teams.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34d399', fontSize: '0.85rem', fontWeight: 700 }}>
                    Launch EP Portal <ArrowRight size={14} />
                  </div>
                </div>

                {/* 4. Patient Card */}
                <div
                  className="glass-panel"
                  onClick={() => handleQuickLogin('pushkar', '123456')}
                  style={{
                    padding: 22,
                    cursor: 'pointer',
                    borderLeft: '4px solid #8b5cf6'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f8fafc' }}>Pushkar</span>
                    <span className="badge badge-high">PATIENT</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                    Registered patient in Pinecrest. Book routine visits or transmit real-time emergency triage requests.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#c4b5fd', fontSize: '0.85rem', fontWeight: 700 }}>
                    Launch Patient Portal <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            </div>

            {/* City Network Preview Card */}
            <div className="glass-panel" style={{ padding: 26 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={20} color="#06b6d4" /> Central Hospital City & 14 Interconnected Municipalities
                </h3>
                <span className="badge badge-moderate">15 CITIES • 24 ROADS</span>
              </div>
              <CityMap
                cities={cities}
                roads={roads}
                activeAmbulances={ambulances}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--border-subtle)',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-dim)',
        background: 'rgba(7, 10, 19, 0.9)'
      }}>
        RESQ Hospital Management & Emergency Dispatch System • Directly synchronized with C++ Data Storage
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authMode}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        cities={cities}
      />

      {/* Toast Notification Stack */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
