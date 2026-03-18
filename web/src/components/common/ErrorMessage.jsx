import React from 'react';

export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null;
  return (
    <div style={{
      padding: '0.75rem 1rem',
      background: 'var(--danger-light)',
      borderRadius: 'var(--radius-sm)',
      color: 'var(--danger)',
      fontSize: '0.875rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.5rem',
    }}>
      <span>{message}</span>
      {onRetry && (
        <button className="btn btn-sm btn-secondary" onClick={onRetry}>
          Opnieuw
        </button>
      )}
    </div>
  );
}
