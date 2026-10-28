import React from 'react';
import { Activity, Shield, Stethoscope, User, LogOut, LogIn, UserPlus, Zap } from 'lucide-react';

export default function Navbar({
  currentUser,
  onLogout,
  onOpenLogin,
  onOpenRegister,
  onQuickLogin
}) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 28px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(7, 10, 19, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: 42,
          height: 42,
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #ef4444 0%, #06b6d4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 18px rgba(6, 182, 212, 0.4)'
        }}>
          <Activity size={24} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.04em', background: 'linear-gradient(90deg, #ffffff 40%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              RESQ
            </span>
            <span className="badge badge-low" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
              <span className="ping-dot" style={{ width: 6, height: 6 }}></span> Live Sync
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Hospital Emergency Dispatch & Appointment System
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Fast Switcher for Demo / Testing */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', padding: '0 6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={12} color="#f59e0b" /> Demo Switch:
          </span>
          <button
            onClick={() => onQuickLogin('admin', 'admin123')}
            className="btn-secondary"
            style={{ padding: '4px 9px', fontSize: '0.75rem', borderRadius: '6px' }}
            title="Fast switch to Administrator"
          >
            Admin
          </button>
          <button
            onClick={() => onQuickLogin('dr.hart', 'Doc@1234')}
            className="btn-secondary"
            style={{ padding: '4px 9px', fontSize: '0.75rem', borderRadius: '6px' }}
            title="Fast switch to Dr. Aiden Hart (Cardiology Specialist)"
          >
            Doctor
          </button>
          <button
            onClick={() => onQuickLogin('pushkar', '123456')}
            className="btn-secondary"
            style={{ padding: '4px 9px', fontSize: '0.75rem', borderRadius: '6px' }}
            title="Fast switch to Patient (Pushkar)"
          >
            Patient
          </button>
        </div>

        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* User pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 14px',
              borderRadius: '12px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: currentUser.role === 'ADMIN' ? 'rgba(239, 68, 68, 0.2)' : currentUser.role === 'DOCTOR' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: currentUser.role === 'ADMIN' ? '#f87171' : currentUser.role === 'DOCTOR' ? '#38bdf8' : '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}>
                {currentUser.role === 'ADMIN' ? <Shield size={16} /> : currentUser.role === 'DOCTOR' ? <Stethoscope size={16} /> : <User size={16} />}
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                  {currentUser.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{currentUser.id}</span>
                  <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>• {currentUser.role}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              title="Logout"
            >
              <LogOut size={15} /> Logout
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onOpenLogin}
              className="btn-secondary"
              style={{ fontSize: '0.88rem' }}
            >
              <LogIn size={16} /> Login
            </button>
            <button
              onClick={onOpenRegister}
              className="btn-primary"
              style={{ fontSize: '0.88rem' }}
            >
              <UserPlus size={16} /> Register Patient
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
