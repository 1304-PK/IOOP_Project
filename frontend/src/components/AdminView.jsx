import React, { useState } from 'react';
import {
  ShieldAlert,
  Ambulance,
  Stethoscope,
  Users,
  Calendar,
  MapPin,
  Send,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Activity,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Navigation
} from 'lucide-react';
import CityMap from './CityMap';

const SPECIALIZATIONS = [
  "Cardiology", "Neurology", "Orthopedics", "Pediatrics", "General Medicine"
];

export default function AdminView({
  stats,
  emergencies = [],
  ambulances = [],
  doctors = [],
  appointments = [],
  patients = [],
  cities = [],
  roads = {},
  onRefresh,
  showToast
}) {
  const [activeSection, setActiveSection] = useState('queue'); // 'queue', 'fleet', 'map', 'doctors', 'appointments', 'patients'

  // Route calculator state
  const [routeFrom, setRouteFrom] = useState(0);
  const [routeTo, setRouteTo] = useState(9);
  const [calculatedRoute, setCalculatedRoute] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Add doctor form modal/toggle
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [newDocUsername, setNewDocUsername] = useState('');
  const [newDocPassword, setNewDocPassword] = useState('');
  const [newDocName, setNewDocName] = useState('');
  const [newDocSpec, setNewDocSpec] = useState('Cardiology');
  const [newDocType, setNewDocType] = useState('SPECIALIST');
  const [isAddingDoctor, setIsAddingDoctor] = useState(false);

  // Dispatch Next Emergency
  const [isDispatching, setIsDispatching] = useState(false);

  // Sort pending emergencies by Priority Queue comparator:
  // Severity (1-4) -> epochTime -> seqNum
  const pendingEmergencies = emergencies
    .filter(e => e.status === 'PENDING')
    .sort((a, b) => {
      if (a.severityVal !== b.severityVal) return a.severityVal - b.severityVal;
      if (a.epochTime !== b.epochTime) return a.epochTime - b.epochTime;
      return a.seqNum - b.seqNum;
    });

  const dispatchedEmergencies = emergencies.filter(e => e.status === 'DISPATCHED');
  const emergencyPhysicians = doctors.filter(d => d.type === 'EMERGENCY_PHYSICIAN');

  // Handle Dispatch Next
  const handleDispatchNext = async () => {
    setIsDispatching(true);
    try {
      const res = await fetch('/api/emergencies/dispatch-next', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Dispatch failed');

      showToast({
        type: 'success',
        title: 'Emergency Unit Dispatched!',
        message: `Ambulance ${data.ambulance.id} dispatched with ${data.physicians.join(' & ')} to Emergency ${data.dispatchedEmergency.id}`
      });
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', title: 'Dispatch Not Possible', message: err.message });
    } finally {
      setIsDispatching(false);
    }
  };

  // Handle Complete Emergency Mission
  const handleCompleteMission = async (emergId) => {
    try {
      const res = await fetch(`/api/emergencies/${emergId}/complete`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete mission');

      showToast({
        type: 'success',
        title: 'Mission Completed',
        message: data.message
      });
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  // Handle Route Calculation
  const handleCalculateRoute = async (e) => {
    if (e) e.preventDefault();
    setIsCalculatingRoute(true);
    try {
      const res = await fetch(`/api/route?from=${routeFrom}&to=${routeTo}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Route calculation failed');
      setCalculatedRoute(data);
    } catch (err) {
      showToast({ type: 'error', title: 'Route Error', message: err.message });
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Handle Toggle Doctor Availability
  const handleToggleDoctor = async (docId) => {
    try {
      const res = await fetch('/api/doctors/toggle-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId: docId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle status');

      showToast({ type: 'success', title: 'Doctor Status Updated', message: `Availability set to ${data.available ? 'Available' : 'Unavailable'}` });
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  // Handle Add Doctor
  const handleAddDoctor = async (e) => {
    e.preventDefault();
    setIsAddingDoctor(true);
    try {
      const res = await fetch('/api/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newDocUsername,
          password: newDocPassword,
          name: newDocName,
          specialization: newDocType === 'EMERGENCY_PHYSICIAN' ? 'Emergency' : newDocSpec,
          type: newDocType
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add doctor');

      showToast({ type: 'success', title: 'Doctor Enrolled', message: `Added ${data.doctor.name} (${data.doctor.id})` });
      setShowAddDoctor(false);
      setNewDocUsername('');
      setNewDocPassword('');
      setNewDocName('');
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setIsAddingDoctor(false);
    }
  };

  // Handle Cancel Appointment
  const handleCancelAppointment = async (apptId) => {
    if (!window.confirm(`Cancel appointment ${apptId}?`)) return;
    try {
      const res = await fetch(`/api/appointments/${apptId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel');
      showToast({ type: 'success', title: 'Cancelled', message: `Appointment ${apptId} cancelled.` });
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  // Handle Mark Appointment Complete
  const handleCompleteAppointment = async (apptId) => {
    try {
      const res = await fetch(`/api/appointments/${apptId}/complete`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete');
      showToast({ type: 'success', title: 'Completed', message: `Appointment ${apptId} marked complete.` });
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '24px 20px' }}>
      {/* KPI Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div className="glass-panel" style={{ padding: '16px 20px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PENDING EMERGENCIES</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>
            {stats?.emergencies?.pending ?? 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#fca5a5' }}>
            {stats?.emergencies?.dispatched ?? 0} active dispatched
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', borderLeft: '4px solid #06b6d4' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>AMBULANCE FLEET</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>
            {stats?.ambulances?.available ?? 0} <span style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>/ 10</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#67e8f9' }}>
            {stats?.ambulances?.busy ?? 0} deployed on missions
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>EMERGENCY PHYSICIANS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>
            {stats?.emergencyPhysicians?.available ?? 0} <span style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>/ 4</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#6ee7b7' }}>
            (2 required per dispatch)
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL PATIENTS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>
            {stats?.patients ?? 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#c4b5fd' }}>
            {stats?.doctors ?? 0} registered doctors
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>APPOINTMENTS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>
            {stats?.appointments?.confirmed ?? 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#fcd34d' }}>
            {stats?.appointments?.completed ?? 0} completed visits
          </div>
        </div>
      </div>

      {/* Admin Nav Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 22, overflowX: 'auto', paddingBottom: 6 }}>
        <button
          onClick={() => setActiveSection('queue')}
          className={activeSection === 'queue' ? 'btn-danger' : 'btn-secondary'}
          style={{ fontSize: '0.88rem' }}
        >
          <ShieldAlert size={16} /> Emergency Queue & Dispatch ({pendingEmergencies.length})
        </button>
        <button
          onClick={() => setActiveSection('fleet')}
          className={activeSection === 'fleet' ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize: '0.88rem' }}
        >
          <Ambulance size={16} /> Fleet & Personnel ({ambulances.length} AMBs, {emergencyPhysicians.length} EPs)
        </button>
        <button
          onClick={() => setActiveSection('map')}
          className={activeSection === 'map' ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize: '0.88rem' }}
        >
          <Navigation size={16} /> City Network & Routing
        </button>
        <button
          onClick={() => setActiveSection('doctors')}
          className={activeSection === 'doctors' ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize: '0.88rem' }}
        >
          <Stethoscope size={16} /> Doctors Directory ({doctors.length})
        </button>
        <button
          onClick={() => setActiveSection('appointments')}
          className={activeSection === 'appointments' ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize: '0.88rem' }}
        >
          <Calendar size={16} /> Appointments Ledger ({appointments.length})
        </button>
        <button
          onClick={() => setActiveSection('patients')}
          className={activeSection === 'patients' ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize: '0.88rem' }}
        >
          <Users size={16} /> Patients Directory ({patients.length})
        </button>
      </div>

      {/* SECTION 1: EMERGENCY PRIORITY QUEUE & DISPATCH */}
      {activeSection === 'queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Dispatch Action Header Bar */}
          <div className="glass-panel" style={{ padding: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={22} color="#ef4444" /> Live Emergency Priority Queue
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Triage order sorted automatically by Severity &gt; Timestamp &gt; Sequence Number
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Available: <strong style={{ color: '#10b981' }}>{stats?.ambulances?.available} AMBs</strong> • <strong style={{ color: '#10b981' }}>{stats?.emergencyPhysicians?.available} EPs</strong>
              </div>
              <button
                onClick={handleDispatchNext}
                disabled={isDispatching || pendingEmergencies.length === 0}
                className="btn-danger"
                style={{ padding: '12px 24px', fontSize: '0.95rem' }}
              >
                <Send size={18} /> {isDispatching ? 'Allocating Resources...' : 'Dispatch Next Emergency'}
              </button>
            </div>
          </div>

          {/* Pending Emergencies List */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14 }}>
              Ranked Pending Emergencies ({pendingEmergencies.length})
            </h3>
            {pendingEmergencies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={42} color="#10b981" style={{ margin: '0 auto 10px' }} />
                <p>No pending emergencies. All requests have been served!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendingEmergencies.map((emg, index) => {
                  const city = cities.find(c => c.id === emg.cityId);
                  const isTop = index === 0;

                  return (
                    <div
                      key={emg.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px 20px',
                        borderRadius: 14,
                        background: isTop ? 'rgba(239, 68, 68, 0.12)' : 'rgba(0,0,0,0.2)',
                        border: `1px solid ${isTop ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-subtle)'}`,
                        flexWrap: 'wrap',
                        gap: 12
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: isTop ? '#ef4444' : 'rgba(255,255,255,0.08)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.85rem'
                        }}>
                          #{index + 1}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f8fafc' }}>
                              {emg.category}
                            </span>
                            <span className={`badge ${
                              emg.severity === 'CRITICAL' ? 'badge-critical' :
                              emg.severity === 'HIGH' ? 'badge-high' :
                              emg.severity === 'MODERATE' ? 'badge-moderate' : 'badge-low'
                            }`}>
                              {emg.severity}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>ID: {emg.id}</span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: 14, marginTop: 2 }}>
                            <span><strong>Patient:</strong> {emg.patientId}</span>
                            <span><strong>Target City:</strong> {city?.name || `City ${emg.cityId}`}</span>
                            <span><strong>Requested:</strong> {emg.requestTimestamp}</span>
                          </div>
                        </div>
                      </div>

                      {isTop && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fca5a5', fontSize: '0.82rem', fontWeight: 600 }}>
                          <span className="ping-dot" style={{ backgroundColor: '#ef4444' }}></span> Next for Dispatch
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Dispatched Missions */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ambulance size={18} color="#06b6d4" /> Active Dispatched Missions ({dispatchedEmergencies.length})
            </h3>
            {dispatchedEmergencies.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No active dispatched missions at this time.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {dispatchedEmergencies.map(emg => {
                  const city = cities.find(c => c.id === emg.cityId);
                  return (
                    <div
                      key={emg.id}
                      className="pulse-emergency"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '18px 20px',
                        borderRadius: 14,
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        flexWrap: 'wrap',
                        gap: 14
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f8fafc' }}>
                            {emg.category}
                          </span>
                          <span className="badge badge-critical">{emg.severity}</span>
                          <span className="badge badge-high">DISPATCHED</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>ID: {emg.id}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
                          <span><strong>Ambulance:</strong> {emg.assignedAmbId}</span>
                          <span><strong>Physicians:</strong> {emg.physician1Id}, {emg.physician2Id}</span>
                          <span><strong>Destination:</strong> {city?.name || `City ${emg.cityId}`}</span>
                        </div>
                        {emg.outboundRoute && (
                          <div style={{ fontSize: '0.82rem', color: '#67e8f9', marginTop: 4 }}>
                            <strong>Dijkstra Route ({emg.distanceKm} km):</strong> {emg.outboundRoute}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleCompleteMission(emg.id)}
                        className="btn-primary"
                        style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                      >
                        <CheckCircle2 size={16} /> Complete Mission
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: FLEET & PERSONNEL */}
      {activeSection === 'fleet' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* Ambulance Fleet Grid */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ambulance size={20} color="#06b6d4" /> 10-Ambulance Fleet Status
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
              {ambulances.map(a => {
                const isAvail = a.status === 'AVAILABLE';
                const city = cities.find(c => c.id === a.currentCityId);

                return (
                  <div
                    key={a.id}
                    style={{
                      padding: '14px',
                      borderRadius: 12,
                      background: isAvail ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.12)',
                      border: `1px solid ${isAvail ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.4)'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, color: '#f8fafc', fontSize: '1rem' }}>{a.id}</span>
                      <span className={`badge ${isAvail ? 'badge-low' : 'badge-critical'}`} style={{ fontSize: '0.65rem' }}>
                        {a.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Location: <strong style={{ color: '#f8fafc' }}>{city?.name || `City ${a.currentCityId}`}</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>
                      Caps: {a.capabilities} • Emg: {a.assignedEmergId || 'None'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Emergency Physicians Roster */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Stethoscope size={20} color="#10b981" /> Emergency Physicians (EPs)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {emergencyPhysicians.map(ep => (
                <div
                  key={ep.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>{ep.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ID: {ep.id} • Assigned: {ep.assignedEmergId || 'None'}
                    </div>
                  </div>
                  <span className={`badge ${ep.available ? 'badge-low' : 'badge-critical'}`}>
                    {ep.available ? 'Ready on Duty' : 'Occupied on Mission'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: CITY NETWORK & ROUTING */}
      {activeSection === 'map' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* Interactive Map */}
          <div>
            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={20} color="#06b6d4" /> Visual Road Network & Shortest Route
              </h3>
              <CityMap
                cities={cities}
                roads={roads}
                highlightPath={calculatedRoute?.path || []}
                activeAmbulances={ambulances}
                onSelectCity={id => {
                  if (routeFrom === id) setRouteTo(id);
                  else setRouteFrom(id);
                }}
              />
            </div>
          </div>

          {/* Route Calculator Form */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Navigation size={20} color="#06b6d4" /> Dijkstra Shortest Route Tool
            </h3>

            <form onSubmit={handleCalculateRoute} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Source City
                </label>
                <select
                  className="input-field"
                  value={routeFrom}
                  onChange={e => setRouteFrom(parseInt(e.target.value, 10))}
                >
                  {cities.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (ID: {c.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Destination City
                </label>
                <select
                  className="input-field"
                  value={routeTo}
                  onChange={e => setRouteTo(parseInt(e.target.value, 10))}
                >
                  {cities.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (ID: {c.id})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '12px', width: '100%' }}
                disabled={isCalculatingRoute}
              >
                {isCalculatingRoute ? 'Calculating Dijkstra Path...' : 'Calculate Route'}
              </button>
            </form>

            {calculatedRoute && (
              <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
                  Optimal Shortest Route:
                </div>
                <div style={{ fontSize: '0.9rem', color: '#38bdf8', fontWeight: 600, wordBreak: 'break-word' }}>
                  {calculatedRoute.pathFormatted}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 8 }}>
                  Total Distance: <strong style={{ color: '#10b981' }}>{calculatedRoute.distanceKm} km</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: DOCTORS DIRECTORY */}
      {activeSection === 'doctors' && (
        <div className="glass-panel" style={{ padding: 26 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Doctors Directory</h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Manage staff, availability, and onboarding</p>
            </div>
            <button onClick={() => setShowAddDoctor(true)} className="btn-primary" style={{ fontSize: '0.85rem' }}>
              <PlusCircle size={16} /> Add New Doctor
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {doctors.map(d => (
              <div
                key={d.id}
                style={{
                  padding: '16px',
                  borderRadius: 14,
                  background: 'rgba(0,0,0,0.22)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <h4 style={{ fontWeight: 800, color: '#f8fafc', fontSize: '1.05rem' }}>{d.name}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>ID: {d.id} • @{d.username}</span>
                    </div>
                    <span className={`badge ${d.available ? 'badge-low' : 'badge-high'}`} style={{ fontSize: '0.65rem' }}>
                      {d.available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--cyan)', marginTop: 4 }}>
                    {d.specialization} ({d.type})
                  </div>
                </div>

                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleToggleDoctor(d.id)}
                    className="btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                  >
                    Toggle Availability
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 5: APPOINTMENTS LEDGER */}
      {activeSection === 'appointments' && (
        <div className="glass-panel" style={{ padding: 26 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 16 }}>All Hospital Appointments</h2>
          {appointments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No appointments booked yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {appointments.map(a => {
                const doc = doctors.find(d => d.id === a.doctorId);
                return (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 18px',
                      borderRadius: 12,
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid var(--border-subtle)',
                      flexWrap: 'wrap',
                      gap: 12
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 700, color: '#f8fafc' }}>
                          Appt {a.id} • Patient {a.patientId}
                        </span>
                        <span className={`badge ${a.status === 'CONFIRMED' ? 'badge-low' : a.status === 'COMPLETED' ? 'badge-moderate' : 'badge-critical'}`}>
                          {a.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Doctor: {doc?.name || a.doctorId} ({a.specialization}) • Date: {a.date} at {a.timeSlot}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--cyan)' }}>
                        Reason: "{a.reason}"
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      {a.status === 'CONFIRMED' && (
                        <>
                          <button
                            onClick={() => handleCompleteAppointment(a.id)}
                            className="btn-primary"
                            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                          >
                            <CheckCircle2 size={14} /> Complete
                          </button>
                          <button
                            onClick={() => handleCancelAppointment(a.id)}
                            className="btn-secondary"
                            style={{ fontSize: '0.78rem', padding: '6px 12px', color: '#f87171' }}
                          >
                            <XCircle size={14} /> Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 6: PATIENTS DIRECTORY */}
      {activeSection === 'patients' && (
        <div className="glass-panel" style={{ padding: 26 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 16 }}>Registered Patients Directory</h2>
          {patients.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No patients registered yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {patients.map(p => {
                const city = cities.find(c => c.id === p.cityId);
                return (
                  <div
                    key={p.id}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '1.05rem', marginBottom: 2 }}>{p.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--cyan)' }}>ID: {p.id} • @{p.username}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
                      <div>Phone: {p.phone || 'N/A'}</div>
                      <div>City: {city?.name || `City ${p.cityId}`}</div>
                      <div>Joined: {p.registeredAt}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ADD DOCTOR MODAL */}
      {showAddDoctor && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 20
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 440, background: '#0d1527', padding: 28, borderRadius: 18 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 16 }}>Enlist Medical Staff</h3>
            <form onSubmit={handleAddDoctor} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Username</label>
                <input className="input-field" value={newDocUsername} onChange={e => setNewDocUsername(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Password</label>
                <input type="password" className="input-field" value={newDocPassword} onChange={e => setNewDocPassword(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Doctor Full Name</label>
                <input className="input-field" value={newDocName} onChange={e => setNewDocName(e.target.value)} placeholder="Dr. Jane Doe" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Duty Type</label>
                <select className="input-field" value={newDocType} onChange={e => setNewDocType(e.target.value)}>
                  <option value="SPECIALIST">Department Specialist</option>
                  <option value="EMERGENCY_PHYSICIAN">Emergency Physician (EP)</option>
                </select>
              </div>
              {newDocType === 'SPECIALIST' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Specialization</label>
                  <select className="input-field" value={newDocSpec} onChange={e => setNewDocSpec(e.target.value)}>
                    {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button type="button" onClick={() => setShowAddDoctor(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={isAddingDoctor}>
                  {isAddingDoctor ? 'Adding...' : 'Save Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
