import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDigit = (digit) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');

      if (newPin.length >= 4) {
        handleLogin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const handleLogin = async (pinValue) => {
    setLoading(true);
    try {
      await login(pinValue);
    } catch (err) {
      setError('Onjuiste PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card animate-fade-in">
        <div className="login-header">
          <h1>Familiekalender</h1>
          <p className="text-secondary">Voer je PIN in</p>
        </div>

        <div className="pin-dots">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`pin-dot ${i < pin.length ? 'pin-dot-filled' : ''} ${error ? 'pin-dot-error' : ''}`}
            />
          ))}
        </div>

        {error && <p className="login-error">{error}</p>}

        <div className="pin-pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((digit, i) => (
            <button
              key={i}
              className={`pin-key ${digit === null ? 'pin-key-empty' : ''} ${digit === 'del' ? 'pin-key-action' : ''}`}
              onClick={() => {
                if (digit === 'del') handleDelete();
                else if (digit !== null) handleDigit(String(digit));
              }}
              disabled={loading || digit === null}
            >
              {digit === 'del' ? '⌫' : digit}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
