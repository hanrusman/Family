import React, { useState } from 'react';
import { toDateString } from '../../utils/dateUtils';
import '../common/Modal.css';

export default function EventModal({ event, currentDate, familyMembers, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    title: event?.title || '',
    description: event?.description || '',
    start_time: event?.start_time || `${toDateString(currentDate)}T09:00`,
    end_time: event?.end_time || `${toDateString(currentDate)}T10:00`,
    all_day: event?.all_day || false,
    location: event?.location || '',
    member_id: event?.member_id || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({
      ...form,
      start_time: form.all_day ? `${form.start_time.split('T')[0]}T00:00:00` : form.start_time,
      end_time: form.all_day ? `${form.end_time.split('T')[0]}T23:59:59` : form.end_time,
    });
  };

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{event ? 'Event bewerken' : 'Nieuw event'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="form-label">Titel</label>
            <input className="input" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Titel van het event" autoFocus required />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Start</label>
              <input className="input" type={form.all_day ? 'date' : 'datetime-local'} value={form.all_day ? form.start_time.split('T')[0] : form.start_time} onChange={(e) => update('start_time', e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Einde</label>
              <input className="input" type={form.all_day ? 'date' : 'datetime-local'} value={form.all_day ? form.end_time.split('T')[0] : form.end_time} onChange={(e) => update('end_time', e.target.value)} />
            </div>
          </div>

          <label className="checkbox-label">
            <input type="checkbox" checked={form.all_day} onChange={(e) => update('all_day', e.target.checked)} />
            Hele dag
          </label>

          <div className="form-group">
            <label className="form-label">Locatie</label>
            <input className="input" value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="Optioneel" />
          </div>

          <div className="form-group">
            <label className="form-label">Gezinslid</label>
            <select className="select" value={form.member_id} onChange={(e) => update('member_id', e.target.value)}>
              <option value="">— Geen —</option>
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Beschrijving</label>
            <textarea className="textarea" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Optioneel" rows={2} />
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
