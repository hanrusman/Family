import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';
import { useMenus, useActiveMenu } from '../hooks/useMenu';
import DayCard from '../components/weekmenu/DayCard';
import './SettingsPage.css';

const COLORS = ['#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

const PROVIDER_INFO = {
  google: { label: 'Google Calendar', url: 'https://www.googleapis.com/caldav/v2/' },
  apple: { label: 'Apple Calendar', url: 'https://caldav.icloud.com/' },
  proton: { label: 'Proton Calendar', url: 'http://localhost:1080/' },
  caldav: { label: 'CalDAV (generiek)', url: '' },
};

export default function SettingsPage() {
  const { settings, updateSettings, loadFamily, familyMembers, logout } = useApp();
  const [members, setMembers] = useState([]);
  const [newMember, setNewMember] = useState({ name: '', role: 'child', color: '#3B82F6' });
  const [localSettings, setLocalSettings] = useState(settings || {});
  const [calendars, setCalendars] = useState([]);
  const [showCalendarForm, setShowCalendarForm] = useState(false);
  const [calendarForm, setCalendarForm] = useState({
    provider: 'google', name: '', caldav_url: '', username: '', password: '', member_id: '',
  });
  const [syncStatus, setSyncStatus] = useState({});

  useEffect(() => {
    setMembers(familyMembers);
    setLocalSettings(settings);
  }, [familyMembers, settings]);

  useEffect(() => {
    loadCalendars();
  }, []);

  const loadCalendars = async () => {
    try {
      const data = await api.get('/calendars');
      setCalendars(data);
    } catch {
      // Calendar endpoints may not exist yet
    }
  };

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

  const addCalendar = async () => {
    const form = {
      ...calendarForm,
      caldav_url: calendarForm.caldav_url || PROVIDER_INFO[calendarForm.provider]?.url || '',
    };
    if (!form.name || !form.caldav_url || !form.username || !form.password || !form.member_id) {
      alert('Vul alle velden in');
      return;
    }
    try {
      await api.post('/calendars', form);
      setShowCalendarForm(false);
      setCalendarForm({ provider: 'google', name: '', caldav_url: '', username: '', password: '', member_id: '' });
      loadCalendars();
    } catch (err) {
      alert(err.message);
    }
  };

  const deleteCalendar = async (id) => {
    if (!confirm('Kalender verwijderen? Alle gesynchroniseerde events worden ook verwijderd.')) return;
    try {
      await api.delete(`/calendars/${id}`);
      loadCalendars();
    } catch (err) {
      alert(err.message);
    }
  };

  const syncCalendar = async (id) => {
    setSyncStatus((s) => ({ ...s, [id]: 'syncing' }));
    try {
      await api.post(`/calendars/${id}/sync`);
      setSyncStatus((s) => ({ ...s, [id]: 'done' }));
      loadCalendars();
      setTimeout(() => setSyncStatus((s) => ({ ...s, [id]: null })), 3000);
    } catch (err) {
      setSyncStatus((s) => ({ ...s, [id]: 'error' }));
      alert(`Sync mislukt: ${err.message}`);
    }
  };

  // Demo data management
  const [demoPin, setDemoPin] = useState('');
  const [demoMsg, setDemoMsg] = useState('');
  const [demoLoading, setDemoLoading] = useState('');

  const seedDemo = async () => {
    if (!demoPin) { setDemoMsg('Voer je PIN in'); return; }
    setDemoLoading('seed');
    try {
      const result = await api.post('/settings/seed-demo', { pin: demoPin });
      setDemoMsg(result.message || 'Demodata aangemaakt!');
      setDemoPin('');
      loadFamily();
    } catch (err) {
      setDemoMsg(err.message);
    }
    setDemoLoading('');
  };

  const clearAllData = async () => {
    if (!demoPin) { setDemoMsg('Voer je PIN in'); return; }
    if (!confirm('⚠️ ALLE data wordt verwijderd! Gezinsleden, events, klusjes, maaltijden, boodschappen — alles. Weet je het zeker?')) return;
    setDemoLoading('clear');
    try {
      const result = await api.post('/settings/clear-data', { pin: demoPin });
      setDemoMsg(result.message || 'Alle data verwijderd!');
      setDemoPin('');
      loadFamily();
    } catch (err) {
      setDemoMsg(err.message);
    }
    setDemoLoading('');
  };

  // Tab state
  const [activeTab, setActiveTab] = useState('instellingen');

  // Menu import state
  const [adminPin, setAdminPin] = useState(localStorage.getItem('weekmenu_admin_pin') || '');
  const [importJson, setImportJson] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const { menus, refresh: refreshMenus } = useMenus();
  const { refresh: refreshActiveMenu } = useActiveMenu();

  const saveAdminPin = (pin) => {
    setAdminPin(pin);
    localStorage.setItem('weekmenu_admin_pin', pin);
  };

  const importMenu = async () => {
    if (!importJson.trim() || !adminPin) return;
    try {
      const jsonData = JSON.parse(importJson);
      const res = await fetch('/api/weekmenu/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('fk_token')}`,
        },
        body: JSON.stringify(jsonData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Import mislukt');
      }
      setImportMsg('Menu geimporteerd!');
      setImportJson('');
      refreshMenus();
      refreshActiveMenu();
    } catch (err) {
      setImportMsg(`Fout: ${err.message}`);
    }
  };

  const deleteMenu = async (id) => {
    if (!confirm('Menu verwijderen?')) return;
    try {
      await api.delete(`/weekmenu/${id}`);
      refreshMenus();
      refreshActiveMenu();
    } catch (err) {
      alert(err.message);
    }
  };

  const TABS = [
    { key: 'instellingen', label: '⚙️ Instellingen' },
    { key: 'weekmenu', label: '🍽️ Menu Import' },
    { key: 'recepten', label: '📖 Recepten' },
  ];

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h2>Papa & Mama</h2>
        <button className="btn btn-secondary btn-sm" onClick={logout}>Uitloggen</button>
      </header>

      {/* Tab bar */}
      <div className="flex gap-1 px-4 py-2 border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="settings-content">
        {/* ============ INSTELLINGEN TAB ============ */}
        {activeTab === 'instellingen' && (
          <>
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

        {/* Kalender Koppelingen */}
        <section className="settings-section">
          <h3>Kalender Koppelingen</h3>
          <p className="text-sm text-secondary mb-2">
            Koppel externe agenda's via CalDAV (Google, Apple, Proton).
          </p>

          <div className="calendars-list">
            {calendars.map((cal) => (
              <div key={cal.id} className="calendar-connection card">
                <div className="calendar-connection-info">
                  <span className="font-medium">{cal.name}</span>
                  <span className="text-muted text-sm">
                    {PROVIDER_INFO[cal.provider]?.label || cal.provider}
                    {cal.member_name && ` — ${cal.member_name}`}
                  </span>
                  {cal.last_sync && (
                    <span className="text-xs text-muted">
                      Laatst gesynchroniseerd: {new Date(cal.last_sync).toLocaleString('nl-NL')}
                    </span>
                  )}
                </div>
                <div className="calendar-connection-actions">
                  <button
                    className={`btn btn-sm ${syncStatus[cal.id] === 'syncing' ? 'btn-secondary' : 'btn-ghost'}`}
                    onClick={() => syncCalendar(cal.id)}
                    disabled={syncStatus[cal.id] === 'syncing'}
                  >
                    {syncStatus[cal.id] === 'syncing' ? 'Bezig...' : syncStatus[cal.id] === 'done' ? '✓' : 'Sync'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteCalendar(cal.id)}>✕</button>
                </div>
              </div>
            ))}

            {!showCalendarForm ? (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCalendarForm(true)}>
                + Kalender toevoegen
              </button>
            ) : (
              <div className="calendar-add-form card">
                <div className="form-group">
                  <label className="form-label">Provider</label>
                  <select
                    className="select"
                    value={calendarForm.provider}
                    onChange={(e) => {
                      const provider = e.target.value;
                      setCalendarForm((f) => ({
                        ...f,
                        provider,
                        caldav_url: PROVIDER_INFO[provider]?.url || '',
                      }));
                    }}
                  >
                    <option value="google">Google Calendar</option>
                    <option value="apple">Apple Calendar (iCloud)</option>
                    <option value="proton">Proton Calendar</option>
                    <option value="caldav">CalDAV (generiek)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Naam</label>
                  <input
                    className="input"
                    placeholder="Bijv. 'Werk' of 'Persoonlijk'"
                    value={calendarForm.name}
                    onChange={(e) => setCalendarForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gezinslid</label>
                  <select
                    className="select"
                    value={calendarForm.member_id}
                    onChange={(e) => setCalendarForm((f) => ({ ...f, member_id: e.target.value }))}
                  >
                    <option value="">Kies gezinslid...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">CalDAV URL</label>
                  <input
                    className="input"
                    placeholder={PROVIDER_INFO[calendarForm.provider]?.url || 'https://...'}
                    value={calendarForm.caldav_url}
                    onChange={(e) => setCalendarForm((f) => ({ ...f, caldav_url: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gebruikersnaam</label>
                  <input
                    className="input"
                    placeholder="E-mailadres of gebruikersnaam"
                    value={calendarForm.username}
                    onChange={(e) => setCalendarForm((f) => ({ ...f, username: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Wachtwoord / App-wachtwoord</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="App-specifiek wachtwoord"
                    value={calendarForm.password}
                    onChange={(e) => setCalendarForm((f) => ({ ...f, password: e.target.value }))}
                  />
                </div>

                {calendarForm.provider === 'google' && (
                  <p className="text-xs text-muted">
                    Gebruik een <strong>app-wachtwoord</strong> van Google (ga naar myaccount.google.com → Beveiliging → App-wachtwoorden).
                  </p>
                )}
                {calendarForm.provider === 'apple' && (
                  <p className="text-xs text-muted">
                    Gebruik een <strong>app-specifiek wachtwoord</strong> (ga naar appleid.apple.com → App-wachtwoorden).
                  </p>
                )}
                {calendarForm.provider === 'proton' && (
                  <p className="text-xs text-muted">
                    Proton Calendar vereist <strong>Proton Bridge</strong> voor CalDAV. Zorg dat Bridge draait en gebruik de Bridge-credentials.
                  </p>
                )}

                <div className="flex gap-2">
                  <button className="btn btn-primary btn-sm" onClick={addCalendar}>Opslaan</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowCalendarForm(false)}>Annuleren</button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Weergave */}
        <section className="settings-section">
          <h3>Weergave</h3>

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

        {/* Demo Data */}
        <section className="settings-section">
          <h3>🧪 Demo & Data</h3>
          <p className="text-sm text-secondary mb-2">
            Vul de app met voorbeelddata om te testen, of wis alle data om opnieuw te beginnen.
          </p>

          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
            <label className="form-label">PIN (beveiligingscheck)</label>
            <input
              className="input"
              type="password"
              placeholder="Voer je PIN in"
              value={demoPin}
              onChange={(e) => setDemoPin(e.target.value)}
            />
          </div>

          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={seedDemo}
              disabled={!!demoLoading}
            >
              {demoLoading === 'seed' ? 'Bezig...' : '🎭 Demodata aanmaken'}
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={clearAllData}
              disabled={!!demoLoading}
            >
              {demoLoading === 'clear' ? 'Bezig...' : '🗑️ Alle data wissen'}
            </button>
          </div>

          {demoMsg && (
            <p className="text-sm mt-2" style={{
              color: demoMsg.includes('aangemaakt') || demoMsg.includes('verwijderd') ? 'var(--success)' : 'var(--danger)'
            }}>
              {demoMsg}
            </p>
          )}
        </section>

        {/* Kiosk Info */}
        <section className="settings-section">
          <h3>Tablet Kiosk-modus</h3>
          <div className="card">
            <p className="text-sm text-secondary">
              Open de app op je tablet met <code>?kiosk=1</code> achter de URL voor kiosk-modus (zonder login, alleen-lezen).
            </p>
            <p className="text-sm text-secondary mt-2">
              Voorbeeld: <code>http://family.c4w.nl/?kiosk=1</code>
            </p>
          </div>
        </section>
          </>
        )}

        {/* ============ WEEKMENU IMPORT TAB ============ */}
        {activeTab === 'weekmenu' && (
          <div className="flex flex-col gap-6 max-w-lg">
            <section className="settings-section">
              <h3>Menu importeren</h3>
              <div className="form-group">
                <label className="form-label">Admin PIN</label>
                <input
                  className="input"
                  type="password"
                  value={adminPin}
                  onChange={(e) => saveAdminPin(e.target.value)}
                  placeholder="PIN voor beheer"
                />
              </div>

              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Menu JSON</label>
                <textarea
                  className="textarea"
                  rows={8}
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  placeholder='{"days": [...], "shopping_list": [...], "snack_suggestions": [...]}'
                />
                <button className="btn btn-primary btn-sm mt-2" onClick={importMenu}>
                  Importeren
                </button>
                {importMsg && (
                  <p className={`text-sm mt-1 ${importMsg.startsWith('Fout') ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
                    {importMsg}
                  </p>
                )}
              </div>
            </section>

            <section className="settings-section">
              <h3>Menu geschiedenis</h3>
              <div className="flex flex-col gap-2">
                {menus.length === 0 && (
                  <p className="text-sm text-[var(--text-muted)]">Nog geen menu's geimporteerd</p>
                )}
                {menus.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-[var(--bg-card)]"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <div>
                      <span className="font-medium text-[var(--text-primary)]">Week {m.week_number}</span>
                      <span className="text-sm text-[var(--text-muted)] ml-2">{m.year}</span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                        m.status === 'active' ? 'bg-[var(--success-light)] text-[var(--success)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm text-[var(--danger)]"
                      onClick={() => deleteMenu(m.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ============ RECEPTEN TAB ============ */}
        {activeTab === 'recepten' && <RecipeLibrary />}
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

function RecipeLibrary() {
  const [recipes, setRecipes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async (query) => {
    try {
      setLoading(true);
      const url = query ? `/recipes?search=${encodeURIComponent(query)}` : '/recipes';
      const data = await api.get(url);
      setRecipes(data);
    } catch {
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadRecipes(search);
  };

  if (selected) {
    const data = typeof selected.recipe_data === 'string'
      ? JSON.parse(selected.recipe_data || '{}')
      : (selected.recipe_data || {});

    return (
      <div className="max-w-2xl">
        <button className="btn btn-ghost btn-sm mb-4" onClick={() => setSelected(null)}>
          ← Terug
        </button>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{selected.name}</h3>
        {data.ingredients && (
          <div className="mb-4">
            <h4 className="font-medium text-[var(--text-primary)] mb-2">Ingrediënten</h4>
            <ul className="text-sm text-[var(--text-secondary)]">
              {data.ingredients.map((ing, i) => (
                <li key={i}>{ing.amount} {ing.unit} {ing.name}</li>
              ))}
            </ul>
          </div>
        )}
        {data.steps && (
          <div>
            <h4 className="font-medium text-[var(--text-primary)] mb-2">Bereiding</h4>
            <ol className="text-sm text-[var(--text-secondary)] list-decimal pl-5 flex flex-col gap-2">
              {data.steps.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          className="input flex-1"
          placeholder="Zoek recept..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" type="submit">Zoek</button>
      </form>

      {loading && <p className="text-[var(--text-muted)] text-center">Laden...</p>}

      {!loading && recipes.length === 0 && (
        <p className="text-[var(--text-muted)] text-center py-8">Geen recepten gevonden</p>
      )}

      <div className="flex flex-col gap-2">
        {recipes.map((r) => {
          const tags = r.tags ? JSON.parse(r.tags || '[]') : [];
          return (
            <div
              key={r.id}
              className="p-3 rounded-lg border bg-[var(--bg-card)] cursor-pointer hover:border-[var(--accent)] transition-all"
              style={{ borderColor: 'var(--border-color)' }}
              onClick={() => setSelected(r)}
            >
              <div className="font-medium text-[var(--text-primary)]">{r.name}</div>
              <div className="flex gap-2 mt-1">
                {tags.map((tag, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
