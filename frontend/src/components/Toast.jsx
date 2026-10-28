import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      zIndex: 200,
      maxWidth: 380,
      width: '100%'
    }}>
      {toasts.map(t => {
        const isError = t.type === 'error';
        const isSuccess = t.type === 'success';

        return (
          <div
            key={t.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '12px 16px',
              borderRadius: '12px',
              background: '#0f172a',
              border: `1px solid ${isError ? 'rgba(239, 68, 68, 0.4)' : isSuccess ? 'rgba(16, 185, 129, 0.4)' : 'rgba(6, 182, 212, 0.4)'}`,
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              color: '#f8fafc',
              animation: 'slideUp 0.3s ease'
            }}
          >
            <div style={{ marginTop: 2 }}>
              {isError ? (
                <AlertTriangle size={18} color="#ef4444" />
              ) : isSuccess ? (
                <CheckCircle2 size={18} color="#10b981" />
              ) : (
                <Info size={18} color="#06b6d4" />
              )}
            </div>
            <div style={{ flex: 1, fontSize: '0.88rem' }}>
              {t.title && <div style={{ fontWeight: 600, marginBottom: 2 }}>{t.title}</div>}
              <div style={{ color: 'var(--text-muted)' }}>{t.message}</div>
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
