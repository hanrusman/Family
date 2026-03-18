import React, { useState } from 'react';
import { toDateString, MEAL_TYPE_LABELS } from '../../utils/dateUtils';
import '../common/Modal.css';

export default function MealModal({ meal, defaultDate, defaultType, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    date: meal?.date || defaultDate || toDateString(new Date()),
    meal_type: meal?.meal_type || defaultType || 'dinner',
    title: meal?.title || '',
    notes: meal?.notes || '',
  });

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave(form);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{meal ? 'Maaltijd bewerken' : 'Maaltijd toevoegen'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Datum</label>
              <input className="input" type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Maaltijd</label>
              <select className="select" value={form.meal_type} onChange={(e) => update('meal_type', e.target.value)}>
                {Object.entries(MEAL_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Gerecht</label>
            <input className="input" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Bijv. Spaghetti Bolognese" autoFocus required />
          </div>

          <div className="form-group">
            <label className="form-label">Notities</label>
            <textarea className="textarea" value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Optioneel (bijv. link naar recept)" rows={2} />
          </div>

          <div className="modal-footer">
            {onDelete && (
              <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>Verwijderen</button>
            )}
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Annuleren</button>
            <button type="submit" className="btn btn-primary btn-sm">Opslaan</button>
          </div>
        </form>
      </div>
    </div>
  );
}
