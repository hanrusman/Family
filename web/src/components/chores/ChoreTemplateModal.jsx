import React, { useState } from 'react';
import '../common/Modal.css';

const ICONS = ['📋', '🧹', '🍽️', '🛏️', '📚', '🐕', '🗑️', '🧺', '🪥', '🎒', '🚿', '✏️', '🪴', '🚲', '🐱', '🧽'];
const RECURRENCE_OPTIONS = [
  { value: 'daily', label: 'Dagelijks' },
  { value: 'weekly', label: 'Wekelijks' },
  { value: 'specific_days', label: 'Specifieke dagen' },
];
const DAYS = [
  { value: 'monday', label: 'Ma' },
  { value: 'tuesday', label: 'Di' },
  { value: 'wednesday', label: 'Wo' },
  { value: 'thursday', label: 'Do' },
  { value: 'friday', label: 'Vr' },
  { value: 'saturday', label: 'Za' },
  { value: 'sunday', label: 'Zo' },
];
const TIME_OPTIONS = [
  { value: 'before_school', label: '🌅 Voor school' },
  { value: 'after_school', label: '☀️ Na school' },
  { value: 'before_bed', label: '🌙 Voor bedtijd' },
  { value: 'anytime', label: '⚡ Overdag' },
];

const ROLE_SUGGESTIONS = {
  '🍽️': ['Tafelbaas', 'Dekmeester', 'Tafelkoning'],
  '🧹': ['Veegkampioen', 'Stofvrij-held', 'De Bezembaron'],
  '🛏️': ['Beddenbaas', 'Dekbedmeester', 'Kamerkapitein'],
  '📚': ['Boekenwurm', 'Leesbaron', 'Studieheld'],
  '🐕': ['Dierenverzorger', 'Hondenbaas', 'Wandelkoning'],
  '🗑️': ['Afvalheld', 'Prullenbakbaas', 'Recycleking'],
  '🧺': ['Wasmachinebaas', 'Waskapitein', 'Vouwmeester'],
  '🪥': ['Poetskampioen', 'Tandenbaas'],
  '🎒': ['Tassenbaas', 'Inpakmeester'],
  '🚿': ['Badkamerheld', 'Spetterkapitein'],
  '✏️': ['Huiswerkbaas', 'Studiemeester'],
  '🧽': ['Afwasheld', 'Vaatwasserbaas', 'Spoelkampioen'],
  '🪴': ['Plantenbaas', 'Tuinkampioen', 'Groene Vingers'],
  '🚲': ['Fietsmeester', 'Wielrenner'],
  '🐱': ['Kattenbaas', 'Poezenverzorger'],
};

export default function ChoreTemplateModal({ familyMembers, onSave, onClose }) {
  const [form, setForm] = useState({
    title: '',
    icon: '📋',
    role_title: '',
    member_id: '',
    recurrence: 'daily',
    recurrence_days: '',
    time_of_day: 'anytime',
    points: 1,
  });
  const [selectedDays, setSelectedDays] = useState([]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({
      ...form,
      role_title: form.role_title.trim() || null,
      recurrence_days: form.recurrence === 'specific_days' ? selectedDays.join(',') : null,
    });
  };

  const suggestions = ROLE_SUGGESTIONS[form.icon] || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Nieuw klusje</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="form-label">Naam</label>
            <input className="input" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Bijv. Tafel dekken" autoFocus required />
          </div>

          <div className="form-group">
            <label className="form-label">Icoon</label>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className={`btn btn-icon ${form.icon === icon ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '1.25rem' }}
                  onClick={() => update('icon', icon)}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Fun role title */}
          <div className="form-group">
            <label className="form-label">
              Bijnaam <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optioneel — bijv. "Tafelbaas")</span>
            </label>
            <input
              className="input"
              value={form.role_title}
              onChange={(e) => update('role_title', e.target.value)}
              placeholder="Hoe heet deze held?"
            />
            {suggestions.length > 0 && (
              <div className="flex gap-1.5 mt-1.5" style={{ flexWrap: 'wrap' }}>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="badge"
                    style={{
                      cursor: 'pointer',
                      background: form.role_title === s ? 'var(--accent)' : 'var(--bg-tertiary)',
                      color: form.role_title === s ? 'white' : 'var(--text-secondary)',
                      border: 'none',
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.6rem',
                    }}
                    onClick={() => update('role_title', s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Toegewezen aan</label>
            <select className="select" value={form.member_id} onChange={(e) => update('member_id', e.target.value)}>
              <option value="">— Niet toegewezen —</option>
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Herhaling</label>
            <select className="select" value={form.recurrence} onChange={(e) => update('recurrence', e.target.value)}>
              {RECURRENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {form.recurrence === 'specific_days' && (
            <div className="form-group">
              <label className="form-label">Dagen</label>
              <div className="flex gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    className={`btn btn-sm ${selectedDays.includes(day.value) ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => toggleDay(day.value)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Tijdstip</label>
            <select className="select" value={form.time_of_day} onChange={(e) => update('time_of_day', e.target.value)}>
              {TIME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Sterren</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`btn btn-sm ${form.points === p ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => update('points', p)}
                >
                  {'★'.repeat(p)}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Annuleren</button>
            <button type="submit" className="btn btn-primary btn-sm">Opslaan</button>
          </div>
        </form>
      </div>
    </div>
  );
}
