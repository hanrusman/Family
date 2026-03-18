import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';
import './SettingsPage.css';

const COLORS = ['#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

export default function SettingsPage() {
  const { settings, updateSettings, loadFamily, familyMembers, logout } = useApp();
  const [members, setMembers] = useState([]);
  const [newMember, setNewMember] = useState({ name: '', role: 'child', color: '#3B82F6' });
  const [localSettings, setLocalSettings] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMembers(familyMembers);
    setLocalSettings(settings);
  }, [familyMembers, settings]);

  const saveSetting = async (key, value) => {
    setLocalSettings((s) => ({ ...s, [key]: value }));
    try {
      await updateSettings({ [key]: value });
    } catch (err) {
      console.error(err);
    }
  };

  const addMember = async () => {
    if (!newMember.name.trim()) return;
    try {
      await api.post('/family', newMember);
      setNewMember({ name: '', role: 'child', color: '#3B82F6' });
      loadFamily();
    } catch (err) {
      alert(err.message);
    }
  };

  const deleteMember = async (id) => {
    if (!confirm('Weet je zeker dat je dit gezinslid wilt verwijderen?')) return;
    try {
      await api.delete(`/family/${id}`);
      loadFamily();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h2>Instellingen</h2>
        <button className="btn btn-secondary btn-sm" onClick={logout}>Uitloggen</button>
      </header>

      <div className="settings-content">
        {/* Gezinsleden */}
        <section className="settings-section">
          <h3>Gezinsleden</h3>
          <div className="members-list">
            {members.map((m) => (
              <div key={m.id} className="member-row card">
                <span className="member-color-dot" style={{ backgroundColor: m.color }} />
                <div className="member-info">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-muted text-sm">{m.role === 'adult' ? 'Volwassene' : 'Kind'}</span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => deleteMember(m.id)}>✕</button>
              </div>
            ))}

            <div className="member-add card">
              <input
                className="input"
                placeholder="Naam"
                value={newMember.name}
                onChange={(e) => setNewMember((m) => ({ ...m, name: e.target.value }))}
              />
              <select
                className="select"
                value={newMember.role}
                onChange={(e) => setNewMember((m) => ({ ...m, role: e.target.value }))}
              >
                <option value="adult">Volwassene</option>
                <option value="child">Kind</option>
              </select>
              <div className="color-picker">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={`color-swatch ${newMember.color === c ? 'color-selected' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setNewMember((m) => ({ ...m, color: c }))}
                  />
                ))}
              </div>
              <button className="btn btn-primary btn-sm w-full" onClick={addMember}>Toevoegen</button>
            </div>
          </div>
        </section>

        {/* Weergave */}
        <section className="settings-section">
          <h3>Weergave</h3>

          <div className="setting-row">
            <label className="form-label">Thema</label>
            <div className="flex gap-2">
              <button
                className={`btn btn-sm ${localSettings.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => saveSetting('theme', 'dark')}
              >
                Donker
              </button>
              <button
                className={`btn btn-sm ${localSettings.theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => saveSetting('theme', 'light')}
              >
                Licht
              </button>
            </div>
          </div>

          <div className="setting-row">
            <label className="form-label">Standaardweergave</label>
            <select
              className="select"
              value={localSettings.default_view || 'week'}
              onChange={(e) => saveSetting('default_view', e.target.value)}
            >
              <option value="day">Dag</option>
              <option value="week">Week</option>
              <option value="month">Maand</option>
              <option value="agenda">Agenda</option>
            </select>
          </div>

          <div className="setting-row">
            <label className="form-label">Idle timeout (minuten)</label>
            <input
              className="input"
              type="number"
              min="1"
              max="60"
              value={localSettings.idle_timeout || '5'}
              onChange={(e) => saveSetting('idle_timeout', e.target.value)}
            />
          </div>

          <div className="setting-row">
            <label className="form-label">Dagstart (uur)</label>
            <input
              className="input"
              type="number"
              min="0"
              max="12"
              value={localSettings.day_start_hour || '6'}
              onChange={(e) => saveSetting('day_start_hour', e.target.value)}
            />
          </div>

          <div className="setting-row">
            <label className="form-label">Dageinde (uur)</label>
            <input
              className="input"
              type="number"
              min="12"
              max="24"
              value={localSettings.day_end_hour || '22'}
              onChange={(e) => saveSetting('day_end_hour', e.target.value)}
            />
          </div>
        </section>

        {/* PIN */}
        <section className="settings-section">
          <h3>Beveiliging</h3>
          <PinChanger />
        </section>

        {/* Kiosk Info */}
        <section className="settings-section">
          <h3>Tablet Kiosk-modus</h3>
          <div className="card">
            <p className="text-sm text-secondary">
              Open de app op je tablet met <code>?kiosk=1</code> achter de URL voor kiosk-modus (zonder login, alleen-lezen).
            </p>
            <p className="text-sm text-secondary mt-2">
              Voorbeeld: <code>http://jouw-server:8080/?kiosk=1</code>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function PinChanger() {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [msg, setMsg] = useState('');

  const changePin = async () => {
    if (newPin.length < 4) {
      setMsg('PIN moet minimaal 4 tekens zijn');
      return;
    }
    try {
      await api.put('/settings/pin', { current_pin: currentPin, new_pin: newPin });
      setMsg('PIN gewijzigd!');
      setCurrentPin('');
      setNewPin('');
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="form-group">
        <label className="form-label">Huidige PIN</label>
        <input className="input" type="password" value={currentPin} onChange={(e) => setCurrentPin(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Nieuwe PIN</label>
        <input className="input" type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} />
      </div>
      <button className="btn btn-primary btn-sm" onClick={changePin}>PIN wijzigen</button>
      {msg && <p className="text-sm" style={{ color: msg.includes('gewijzigd') ? 'var(--success)' : 'var(--danger)' }}>{msg}</p>}
    </div>
  );
}
