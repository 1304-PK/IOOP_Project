import React, { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  Ambulance,
  Phone,
  Home,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import CityMap from './CityMap';

const EMG_CATEGORIES = [
  "Cardiac Arrest", "Stroke", "Trauma", "Fracture",
  "Respiratory Distress", "Burns", "Poisoning", "Other"
];

const SPECIALIZATIONS = [
  "Cardiology", "Neurology", "Orthopedics", "Pediatrics", "General Medicine"
];

const APPT_TIMES = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

export default function PatientView({
  currentUser,
  cities = [],
  doctors = [],
  appointments = [],
  emergencies = [],
  onRefresh,
  showToast
}) {
  const [activeTab, setActiveTab] = useState('emergency'); // 'emergency', 'book', 'appointments', 'history', 'profile'

  // Emergency Form State
  const [emgCategory, setEmgCategory] = useState(EMG_CATEGORIES[0]);
  const [emgSeverity, setEmgSeverity] = useState('CRITICAL');
  const [patientCityId, setPatientCityId] = useState(currentUser?.cityId ?? 0);
  const [isSubmittingEmg, setIsSubmittingEmg] = useState(false);

  // Appointment Booking State
  const [selectedSpec, setSelectedSpec] = useState(SPECIALIZATIONS[0]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [apptDate, setApptDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [apptTime, setApptTime] = useState('');
  const [apptReason, setApptReason] = useState('Routine checkup');
  const [isBookingAppt, setIsBookingAppt] = useState(false);

  // Filter patient's data
  const myAppointments = appointments.filter(a => a.patientId === currentUser?.id);
  const myEmergencies = emergencies.filter(e => e.patientId === currentUser?.id);

  // Doctors for selected specialization (excluding EPs)
  const specDoctors = doctors.filter(d => d.specialization === selectedSpec && d.type !== 'EMERGENCY_PHYSICIAN');
  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);

  // Patient city object
  const currentCityObj = cities.find(c => c.id === patientCityId) || { id: 0, name: 'Central Hospital City' };

  // Handle Emergency Submission
  const handleEmergencySubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingEmg(true);
    try {
      const res = await fetch('/api/emergencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: currentUser.id,
          cityId: patientCityId,
          category: emgCategory,
          severity: emgSeverity
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit emergency');

      showToast({
        type: 'success',
        title: 'Emergency Request Logged!',
        message: `ID ${data.emergency.id} queued at ${emgSeverity} priority.`
      });
      onRefresh();
      setActiveTab('history');
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setIsSubmittingEmg(false);
    }
  };

  // Handle Appointment Booking
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      showToast({ type: 'error', title: 'Error', message: 'Please select a doctor.' });
      return;
    }
    if (!apptTime) {
      showToast({ type: 'error', title: 'Error', message: 'Please select a time slot.' });
      return;
    }

    setIsBookingAppt(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: currentUser.id,
          doctorId: selectedDoctorId,
          date: apptDate,
          timeSlot: apptTime,
          reason: apptReason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to book appointment');

      showToast({
        type: 'success',
        title: 'Appointment Confirmed!',
        message: `Booked with ${selectedDoctor?.name} on ${apptDate} at ${apptTime}`
      });
      onRefresh();
      setActiveTab('appointments');
    } catch (err) {
      showToast({ type: 'error', title: 'Booking Failed', message: err.message });
    } finally {
      setIsBookingAppt(false);
    }
  };

  // Handle Cancel Appointment
  const handleCancelAppointment = async (apptId) => {
    if (!window.confirm(`Are you sure you want to cancel appointment ${apptId}?`)) return;
    try {
      const res = await fetch(`/api/appointments/${apptId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel appointment');

      showToast({ type: 'success', title: 'Cancelled', message: `Appointment ${apptId} has been cancelled.` });
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
      {/* Patient Welcome Banner */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', marginBottom: 4 }}>
            Welcome back, {currentUser?.name}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={15} color="#06b6d4" /> Registered City: <strong style={{ color: '#f8fafc' }}>{currentCityObj.name}</strong> (ID: {patientCityId})
          </p>
        </div>

        {/* Quick Nav Tabs */}
        <div style={{ display: 'flex', gap: 8, background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 12 }}>
          <button
            onClick={() => setActiveTab('emergency')}
            className={activeTab === 'emergency' ? 'btn-danger' : 'btn-secondary'}
            style={{ fontSize: '0.85rem', padding: '8px 16px' }}
          >
            <ShieldAlert size={16} /> Request Emergency
          </button>
          <button
            onClick={() => setActiveTab('book')}
            className={activeTab === 'book' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.85rem', padding: '8px 16px' }}
          >
            <Calendar size={16} /> Book Visit
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={activeTab === 'appointments' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.85rem', padding: '8px 16px' }}
          >
            <Clock size={16} /> My Appointments ({myAppointments.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.85rem', padding: '8px 16px' }}
          >
            <Ambulance size={16} /> Emergencies ({myEmergencies.length})
          </button>
        </div>
      </div>

      {/* TAB 1: EMERGENCY REQUEST */}
      {activeTab === 'emergency' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 480px) 1fr', gap: 24, alignItems: 'start' }}>
          {/* Form */}
          <div className="glass-panel" style={{ padding: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldAlert size={20} color="#ef4444" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Dispatch Emergency Unit</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Priority triage connects with hospital ambulance fleet</p>
              </div>
            </div>

            <form onSubmit={handleEmergencySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Patient City */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Incident City Location
                </label>
                <select
                  className="input-field"
                  value={patientCityId}
                  onChange={e => setPatientCityId(parseInt(e.target.value, 10))}
                >
                  {cities.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.id === 0 ? '(Central Hub)' : `(City ID: ${c.id})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Emergency Category */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Medical Category
                </label>
                <select
                  className="input-field"
                  value={emgCategory}
                  onChange={e => setEmgCategory(e.target.value)}
                >
                  {EMG_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Severity Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Triage Severity Level
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { key: 'CRITICAL', label: '1 - Critical', sub: 'Immediate life-threat', color: '#ef4444' },
                    { key: 'HIGH', label: '2 - High', sub: 'Urgent (<15m)', color: '#f59e0b' },
                    { key: 'MODERATE', label: '3 - Moderate', sub: 'Serious (<30m)', color: '#06b6d4' },
                    { key: 'LOW', label: '4 - Low', sub: 'Non-urgent', color: '#10b981' }
                  ].map(s => {
                    const isSelected = emgSeverity === s.key;
                    return (
                      <div
                        key={s.key}
                        onClick={() => setEmgSeverity(s.key)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 12,
                          background: isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.2)',
                          border: `2px solid ${isSelected ? s.color : 'rgba(255,255,255,0.06)'}`,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ color: s.color, fontWeight: 700, fontSize: '0.88rem' }}>{s.label}</div>
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>{s.sub}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="btn-danger"
                style={{ width: '100%', marginTop: 8, padding: '14px', fontSize: '0.95rem' }}
                disabled={isSubmittingEmg}
              >
                {isSubmittingEmg ? 'Transmitting Request...' : 'Transmit Emergency Request'}
              </button>
            </form>
          </div>

          {/* Map Preview & Live Info */}
          <div>
            <div className="glass-panel" style={{ padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={18} color="#06b6d4" /> City Network Preview
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                Ambulances dispatch from Central Hospital City (ID 0) and route via shortest Dijkstra path.
              </p>
              <CityMap
                cities={cities}
                roads={cities.roads}
                selectedCity={patientCityId}
                onSelectCity={setPatientCityId}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BOOK APPOINTMENT */}
      {activeTab === 'book' && (
        <div className="glass-panel" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(6, 182, 212, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={20} color="#06b6d4" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Book Specialist Consultation</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Choose specialization, doctor, and date to book an available time slot</p>
            </div>
          </div>

          <form onSubmit={handleBookAppointment}>
            {/* Step 1: Specialization Selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                1. Select Medical Department
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {SPECIALIZATIONS.map(spec => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => { setSelectedSpec(spec); setSelectedDoctorId(''); setApptTime(''); }}
                    className={selectedSpec === spec ? 'btn-primary' : 'btn-secondary'}
                    style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Doctor Selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                2. Select Specialist in {selectedSpec}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {specDoctors.map(doc => {
                  const isSelected = selectedDoctorId === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => { setSelectedDoctorId(doc.id); setApptTime(''); }}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 12,
                        background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'rgba(0,0,0,0.2)',
                        border: `2px solid ${isSelected ? 'var(--cyan)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: '#f8fafc' }}>{doc.name}</span>
                        <span className={`badge ${doc.available ? 'badge-low' : 'badge-high'}`} style={{ fontSize: '0.65rem' }}>
                          {doc.available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Doctor ID: {doc.id} • {doc.specialization}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3 & 4: Date and Slots */}
            {selectedDoctorId && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 20, background: 'rgba(0,0,0,0.2)', padding: 18, borderRadius: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                    3. Appointment Date
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={apptDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => { setApptDate(e.target.value); setApptTime(''); }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                    4. Available Time Slots on {apptDate}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {APPT_TIMES.map(slot => {
                      const slotKey = `${apptDate}|${slot}`;
                      const isBooked = selectedDoctor?.bookedSlots && selectedDoctor.bookedSlots[slotKey];
                      const isSelected = apptTime === slot;

                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isBooked}
                          onClick={() => setApptTime(slot)}
                          className={isSelected ? 'btn-primary' : 'btn-secondary'}
                          style={{
                            padding: '8px',
                            fontSize: '0.82rem',
                            borderRadius: 8,
                            opacity: isBooked ? 0.35 : 1,
                            textDecoration: isBooked ? 'line-through' : 'none'
                          }}
                        >
                          <Clock size={12} /> {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Reason & Confirm */}
            {selectedDoctorId && apptTime && (
              <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border-subtle)' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                  5. Reason for Consultation
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={apptReason}
                  onChange={e => setApptReason(e.target.value)}
                  placeholder="e.g. Chest discomfort, annual screening, follow-up..."
                  required
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ padding: '12px 28px', fontSize: '0.95rem' }}
                    disabled={isBookingAppt}
                  >
                    {isBookingAppt ? 'Confirming Booking...' : 'Confirm Appointment'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* TAB 3: MY APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="glass-panel" style={{ padding: 26 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>My Scheduled Appointments</h2>
          {myAppointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <Calendar size={48} color="#64748b" style={{ margin: '0 auto 12px' }} />
              <p>You have no scheduled appointments.</p>
              <button onClick={() => setActiveTab('book')} className="btn-primary" style={{ marginTop: 14 }}>
                Book Your First Visit
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myAppointments.map(appt => {
                const doc = doctors.find(d => d.id === appt.doctorId);
                const isConfirmed = appt.status === 'CONFIRMED';
                const isCompleted = appt.status === 'COMPLETED';

                return (
                  <div
                    key={appt.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px 20px',
                      borderRadius: 14,
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid var(--border-subtle)',
                      flexWrap: 'wrap',
                      gap: 12
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc' }}>
                          {doc ? doc.name : appt.doctorId}
                        </span>
                        <span className={`badge ${isConfirmed ? 'badge-low' : isCompleted ? 'badge-moderate' : 'badge-critical'}`}>
                          {appt.status}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>ID: {appt.id}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: 14 }}>
                        <span><strong>Specialization:</strong> {appt.specialization}</span>
                        <span><strong>Date:</strong> {appt.date}</span>
                        <span><strong>Slot:</strong> {appt.timeSlot}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--cyan)', marginTop: 4 }}>
                        <em>"{appt.reason}"</em>
                      </div>
                    </div>

                    {isConfirmed && (
                      <button
                        onClick={() => handleCancelAppointment(appt.id)}
                        className="btn-secondary"
                        style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '6px 14px', fontSize: '0.82rem' }}
                      >
                        <XCircle size={15} /> Cancel Appointment
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MY EMERGENCY HISTORY */}
      {activeTab === 'history' && (
        <div className="glass-panel" style={{ padding: 26 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>My Emergency History</h2>
          {myEmergencies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <ShieldAlert size={48} color="#64748b" style={{ margin: '0 auto 12px' }} />
              <p>No emergency requests found for this patient.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {myEmergencies.map(emg => {
                const isPending = emg.status === 'PENDING';
                const isDispatched = emg.status === 'DISPATCHED';
                const isCompleted = emg.status === 'COMPLETED';
                const city = cities.find(c => c.id === emg.cityId);

                return (
                  <div
                    key={emg.id}
                    className={isDispatched ? 'pulse-emergency' : ''}
                    style={{
                      padding: '20px',
                      borderRadius: 14,
                      background: 'rgba(0,0,0,0.25)',
                      border: `1px solid ${isDispatched ? 'rgba(239, 68, 68, 0.5)' : 'var(--border-subtle)'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f8fafc' }}>
                          {emg.category}
                        </span>
                        <span className={`badge ${
                          emg.severity === 'CRITICAL' ? 'badge-critical' :
                          emg.severity === 'HIGH' ? 'badge-high' :
                          emg.severity === 'MODERATE' ? 'badge-moderate' : 'badge-low'
                        }`}>
                          {emg.severity}
                        </span>
                        <span className={`badge ${isDispatched ? 'badge-critical' : isPending ? 'badge-high' : 'badge-low'}`}>
                          {emg.status}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                        Requested: {emg.requestTimestamp}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <div><strong>Location:</strong> {city?.name || `City ${emg.cityId}`}</div>
                      <div><strong>Assigned Ambulance:</strong> {emg.assignedAmbId || 'Awaiting assignment'}</div>
                      <div><strong>Physicians:</strong> {emg.physician1Id ? `${emg.physician1Id}, ${emg.physician2Id}` : 'Awaiting assignment'}</div>
                      {emg.completedAt && <div><strong>Completed At:</strong> {emg.completedAt}</div>}
                    </div>

                    {emg.outboundRoute && (
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.82rem', color: 'var(--cyan)' }}>
                        <strong>Dispatched Route ({emg.distanceKm} km):</strong> {emg.outboundRoute}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
