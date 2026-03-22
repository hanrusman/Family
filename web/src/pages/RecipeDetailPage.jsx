import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDay } from '../hooks/useMenu';
import { api } from '../utils/api';
import RecipeView from '../components/weekmenu/RecipeView';

export default function RecipeDetailPage() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const { data: day, loading, error, refresh } = useDay(dayId);
  const [feedback, setFeedback] = useState(null);
  const [rating, setRating] = useState('');
  const [notes, setNotes] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  useEffect(() => {
    if (day?.id) {
      loadFeedback();
    }
  }, [day?.id]);

  const loadFeedback = async () => {
    try {
      const fb = await api.get(`/weekmenu/${day.menu_id}/days/${day.id}/feedback`);
      if (fb) {
        setFeedback(fb);
        setRating(fb.rating || '');
        setNotes(fb.notes || '');
      }
    } catch {
      // No feedback yet
    }
  };

  const completeDay = async () => {
    try {
      await api.patch(`/weekmenu/${day.menu_id}/days/${day.id}/complete`);
      refresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const saveFeedback = async () => {
    if (!rating) return;
    try {
      await api.post(`/weekmenu/${day.menu_id}/days/${day.id}/feedback`, { rating, notes });
      setFeedbackMsg('Feedback opgeslagen!');
      loadFeedback();
    } catch (err) {
      setFeedbackMsg(`Fout: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-[var(--text-muted)]">Laden...</div>;
  }

  if (error || !day) {
    return (
      <div className="p-4 text-center">
        <p className="text-[var(--danger)]">{error || 'Dag niet gevonden'}</p>
        <button className="btn btn-ghost btn-sm mt-4" onClick={() => navigate(-1)}>← Terug</button>
      </div>
    );
  }

  const recipe = typeof day.recipe_data === 'string' ? JSON.parse(day.recipe_data || '{}') : (day.recipe_data || {});
  const completed = day.status === 'completed';

  return (
    <div className="p-4 overflow-y-auto max-w-2xl mx-auto">
      <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate('/menu')}>
        ← Terug naar menu
      </button>

      <div className="mb-4">
        <div className="text-sm text-[var(--text-muted)] uppercase tracking-wider">{day.day_name}</div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">{day.recipe_name}</h2>
        <div className="flex gap-3 mt-1 text-sm text-[var(--text-muted)]">
          {day.prep_time_minutes && <span>⏱ {day.prep_time_minutes} min</span>}
          {day.cost_index && <span>{day.cost_index}</span>}
          {day.meal_type && <span className="capitalize">{day.meal_type}</span>}
        </div>
      </div>

      <RecipeView recipe={recipe} />

      {/* Complete button */}
      {!completed && (
        <button
          className="btn btn-primary w-full mt-6"
          onClick={completeDay}
        >
          ✅ Maaltijd afronden
        </button>
      )}

      {/* Feedback section (after completion) */}
      {completed && (
        <div className="mt-6 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <h4 className="font-semibold text-[var(--text-primary)] mb-3">Hoe was het?</h4>

          <div className="flex gap-3 mb-3">
            {[
              { value: 'lekker', emoji: '😋', label: 'Lekker' },
              { value: 'ok', emoji: '😐', label: 'OK' },
              { value: 'minder', emoji: '😕', label: 'Minder' },
            ].map((opt) => (
              <button
                key={opt.value}
                className={`flex-1 py-2 rounded-lg text-center transition-all border
                  ${rating === opt.value
                    ? 'border-forest-500 bg-forest-500/10'
                    : 'border-[var(--border-color)] bg-[var(--bg-tertiary)]'}`}
                onClick={() => setRating(opt.value)}
              >
                <span className="text-xl">{opt.emoji}</span>
                <div className="text-xs text-[var(--text-muted)] mt-1">{opt.label}</div>
              </button>
            ))}
          </div>

          <textarea
            className="textarea text-sm"
            rows={2}
            placeholder="Opmerkingen (optioneel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <button className="btn btn-primary btn-sm mt-2" onClick={saveFeedback}>
            Feedback opslaan
          </button>

          {feedbackMsg && (
            <p className={`text-sm mt-2 ${feedbackMsg.startsWith('Fout') ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
              {feedbackMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
