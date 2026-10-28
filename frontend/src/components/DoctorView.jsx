import React, { useState } from 'react';
import {
  Stethoscope,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Power,
  User,
  Shield,
  Ambulance,
  MapPin
} from 'lucide-react';

export default function DoctorView({
  currentUser,
  doctors = [],
  appointments = [],
  emergencies = [],
  onRefresh,
  showToast
}) {
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments', 'schedule', 'profile'
  const [isToggling, setIsToggling] = useState(false);

  // Get current doctor fresh data from doctor list
  const currentDoctor = doctors.find(d => d.id === currentUser?.id) || currentUser;
  const isEP = currentDoctor?.type === 'EMERGENCY_PHYSICIAN';

  // Appointments for this doctor
  const docAppointments = appointments.filter(a => a.doctorId === currentDoctor.id);

  // Active emergency for EP (if assigned)
  const activeEmergency = emergencies.find(e =>
    e.id === currentDoctor?.assignedEmergId ||
    e.physician1Id === currentDoctor?.id ||
    e.physician2Id === currentDoctor?.id
  );

  // Toggle Doctor Availability
  const handleToggleAvailability = async () => {
    setIsToggling(true);
    try {
      const res = await fetch('/api/doctors/toggle-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId: currentDoctor.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle availability');

      showToast({
        type: 'success',
        title: 'Status Updated',
        message: `Availability set to ${data.available ? 'Available' : 'Unavailable'}`
      });
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setIsToggling(false);
    }
  };

  // Mark Appointment Complete
  const handleMarkComplete = async (apptId) => {
    try {
      const res = await fetch(`/api/appointments/${apptId}/complete`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete appointment');

      showToast({
        type: 'success',
        title: 'Completed',
        message: `Appointment ${apptId} marked as completed.`
      });
      onRefresh();
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  // Booked slots list
  const bookedSlotEntries = Object.entries(currentDoctor?.bookedSlots || {}).map(([slotKey, apptId]) => {
    const [date, time] = slotKey.split('|');
    return { date, time, apptId };
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
      {/* Doctor Header Banner */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)'
          }}>
            <Stethoscope size={28} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{currentDoctor.name}</h1>
              <span className={`badge ${currentDoctor.available ? 'badge-low' : 'badge-high'}`}>
                {currentDoctor.available ? 'Available' : 'Unavailable'}
              </span>
              <span className="badge badge-moderate">
                {isEP ? 'Emergency Physician' : currentDoctor.specialization}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Doctor ID: <strong>{currentDoctor.id}</strong> • Role: {currentDoctor.type}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleToggleAvailability}
            disabled={isToggling}
            className={currentDoctor.available ? 'btn-secondary' : 'btn-primary'}
            style={{ fontSize: '0.85rem', padding: '10px 18px' }}
          >
            <Power size={16} /> {currentDoctor.available ? 'Set Unavailable' : 'Set Available'}
          </button>
        </div>
      </div>

      {/* Emergency Physician Alert (If Assigned) */}
      {isEP && activeEmergency && (
        <div className="glass-panel pulse-emergency" style={{ padding: 22, marginBottom: 24, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={20} color="#ef4444" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fca5a5' }}>
                Active Emergency Dispatch Mission
              </h3>
            </div>
            <span className="badge badge-critical">{activeEmergency.severity}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: '0.85rem', color: '#f8fafc' }}>
            <div><strong>Emergency ID:</strong> {activeEmergency.id}</div>
            <div><strong>Condition:</strong> {activeEmergency.category}</div>
            <div><strong>Ambulance Unit:</strong> {activeEmergency.assignedAmbId}</div>
            <div><strong>Target City ID:</strong> {activeEmergency.cityId}</div>
          </div>
          {activeEmergency.outboundRoute && (
            <div style={{ marginTop: 10, fontSize: '0.82rem', color: '#67e8f9' }}>
              <strong>Route ({activeEmergency.distanceKm} km):</strong> {activeEmergency.outboundRoute}
            </div>
          )}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('appointments')}
          className={activeTab === 'appointments' ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize: '0.88rem' }}
        >
          <Calendar size={16} /> My Appointments ({docAppointments.length})
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={activeTab === 'schedule' ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize: '0.88rem' }}
        >
          <Clock size={16} /> Booked Schedule Slots ({bookedSlotEntries.length})
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize: '0.88rem' }}
        >
          <User size={16} /> Doctor Profile
        </button>
      </div>

      {/* TAB 1: APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="glass-panel" style={{ padding: 26 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>Patient Appointments Ledger</h2>
          {docAppointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <Calendar size={48} color="#64748b" style={{ margin: '0 auto 12px' }} />
              <p>No appointments booked with you currently.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {docAppointments.map(appt => {
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
                          Patient {appt.patientId}
                        </span>
                        <span className={`badge ${isConfirmed ? 'badge-low' : isCompleted ? 'badge-moderate' : 'badge-critical'}`}>
                          {appt.status}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>ID: {appt.id}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
                        <span><strong>Date:</strong> {appt.date}</span>
                        <span><strong>Time Slot:</strong> {appt.timeSlot}</span>
                        <span><strong>Booked At:</strong> {appt.bookedAt}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--cyan)', marginTop: 4 }}>
                        <em>Reason: "{appt.reason}"</em>
                      </div>
                    </div>

                    {isConfirmed && (
                      <button
                        onClick={() => handleMarkComplete(appt.id)}
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                      >
                        <CheckCircle size={15} /> Mark Completed
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SCHEDULE */}
      {activeTab === 'schedule' && (
        <div className="glass-panel" style={{ padding: 26 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>Booked Schedule Timeslots</h2>
          {bookedSlotEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <Clock size={48} color="#64748b" style={{ margin: '0 auto 12px' }} />
              <p>All time slots are currently open and available for booking.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {bookedSlotEntries.map((slot, i) => (
                <div
                  key={i}
                  style={{
                    padding: '16px',
                    borderRadius: 12,
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: '#f8fafc' }}>{slot.date}</span>
                    <span className="badge badge-high" style={{ fontSize: '0.7rem' }}>{slot.time}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Appointment Ref: <strong style={{ color: 'var(--cyan)' }}>{slot.apptId}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PROFILE */}
      {activeTab === 'profile' && (
        <div className="glass-panel" style={{ padding: 26, maxWidth: 600 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 20 }}>Staff Profile</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Full Name</span>
              <strong style={{ color: '#f8fafc' }}>{currentDoctor.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Doctor ID</span>
              <strong style={{ color: '#f8fafc' }}>{currentDoctor.id}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Username</span>
              <strong style={{ color: '#f8fafc' }}>{currentDoctor.username}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Specialization</span>
              <strong style={{ color: '#f8fafc' }}>{currentDoctor.specialization}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Role Category</span>
              <strong style={{ color: '#f8fafc' }}>{currentDoctor.type}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Duty Status</span>
              <span className={`badge ${currentDoctor.available ? 'badge-low' : 'badge-high'}`}>
                {currentDoctor.available ? 'Active / Available' : 'Occupied / Offline'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
