import React, { useState, useCallback, useMemo } from 'react';
import { getISOWeek } from 'date-fns';
import { useApp } from '../context/AppContext';
import { api, tabletApi } from '../utils/api';
import { usePolling } from '../hooks/usePolling';
import {
  toDateString, formatNL, getWeekDays, isToday,
} from '../utils/dateUtils';
import MealModal from '../components/meals/MealModal';
import './MealsPage.css';

const DAY_LABELS = ['MAA', 'DIN', 'WOE', 'DON', 'VRI', 'ZAT', 'ZON'];

function getMealEmoji(title) {
  if (!title) return '\u{1F37D}\u{FE0F}';
  const t = title.toLowerCase();
  if (t.includes('pasta') || t.includes('spaghetti')) return '\u{1F35D}';
  if (t.includes('taco')) return '\u{1F32E}';
  if (t.includes('salade')) return '\u{1F957}';
  if (t.includes('soep')) return '\u{1F372}';
  if (t.includes('pizza')) return '\u{1F355}';
  if (t.includes('burger')) return '\u{1F354}';
  if (t.includes('braad') || t.includes('vlees')) return '\u{1F969}';
  if (t.includes('vis')) return '\u{1F41F}';
  return '\u{1F37D}\u{FE0F}';
}

function parseCook(notes) {
  if (!notes) return null;
  const match = notes.match(/kok:\s*(.+)/i) || notes.match(/chef:\s*(.+)/i) || notes.match(/bereid door:\s*(.+)/i);
  return match ? match[1].trim() : null;
}

export default function MealsPage() {
  const { isTabletMode } = useApp();
  const [currentDate] = useState(new Date());
  const [meals, setMeals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const weekDays = getWeekDays(currentDate);
  const weekStart = toDateString(weekDays[0]);
  const weekEnd = toDateString(weekDays[6]);
  const weekNumber = getISOWeek(currentDate);

  // Track which day cards are expanded; today is open by default
  const todayStr = toDateString(currentDate);
  const [expanded, setExpanded] = useState(() => {
    const initial = {};
    weekDays.forEach((day) => {
      const ds = toDateString(day);
      initial[ds] = ds === todayStr;
    });
    return initial;
  });

  const toggleExpand = (dateStr) => {
    setExpanded((prev) => ({ ...prev, [dateStr]: !prev[dateStr] }));
  };

  const fetchMeals = useCallback(async () => {
    try {
      const fetcher = isTabletMode ? tabletApi : api;
      const data = await fetcher.get(`/meals?start=${weekStart}&end=${weekEnd}`);
      setMeals(data);
    } catch (err) {
      console.warn('Kan weekmenu niet laden:', err.message);
    }
  }, [weekStart, weekEnd, isTabletMode]);

  usePolling(fetchMeals, 60000, [weekStart]);

  // Only dinner meals, indexed by date
  const dinnerByDate = useMemo(() => {
    const map = {};
    meals.filter((m) => m.meal_type === 'dinner').forEach((m) => {
      map[m.date] = m;
    });
    return map;
  }, [meals]);

  const handleSave = async (data) => {
    try {
      if (editingMeal) {
        await api.put(`/meals/${editingMeal.id}`, data);
      } else {
        await api.post('/meals', data);
      }
      fetchMeals();
      setShowModal(false);
      setEditingMeal(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/meals/${id}`);
      fetchMeals();
    } catch (err) {
      alert(err.message);
    }
  };

  const openAdd = (dateStr) => {
    setSelectedDate(dateStr);
    setEditingMeal(null);
    setShowModal(true);
  };

  return (
    <div className="meals-page">
      {/* Header */}
      <header className="meals-header-new">
        <div className="meals-header-left">
          <h2 className="meals-title">
            Menu van deze week{' '}
            <span role="img" aria-label="plate">{'\u{1F37D}\u{FE0F}'}</span>
          </h2>
          <p className="meals-subtitle">Wat eten we vandaag? Geen verrassingen meer!</p>
        </div>
        <div className="meals-week-badge">
          <span role="img" aria-label="calendar">{'\u{1F4C5}'}</span>{' '}
          Week {weekNumber}
        </div>
      </header>

      {/* Day accordion list */}
      <div className="meals-accordion">
        {weekDays.map((day, idx) => {
          const dateStr = toDateString(day);
          const today = isToday(day);
          const meal = dinnerByDate[dateStr];
          const isOpen = !!expanded[dateStr];
          const emoji = getMealEmoji(meal?.title);
          const cook = parseCook(meal?.notes);
          const dayLabel = DAY_LABELS[idx];

          return (
            <div
              key={dateStr}
              className={`meals-card ${today ? 'meals-card-today' : 'meals-card-default'}`}
            >
              {/* Collapsed header row */}
              <button
                className="meals-card-header"
                onClick={() => toggleExpand(dateStr)}
                aria-expanded={isOpen}
                type="button"
              >
                {/* Day badge */}
                <div className={`meals-day-badge ${today ? 'meals-day-badge-today' : ''}`}>
                  <span className="meals-day-badge-emoji">{emoji}</span>
                  <span className="meals-day-badge-label">{dayLabel}</span>
                  <span className="meals-day-badge-date">{formatNL(day, 'd MMM')}</span>
                </div>

                {/* Title area */}
                <div className="meals-card-info">
                  {meal ? (
                    <>
                      <span className="meals-card-title">{meal.title}</span>
                      {meal.description && (
                        <span className="meals-card-subtitle">{meal.description}</span>
                      )}
                    </>
                  ) : (
                    <span className="meals-card-empty">Nog geen diner gepland</span>
                  )}
                </div>

                {/* Cook badge */}
                {cook && (
                  <span className="meals-cook-badge">
                    <span role="img" aria-label="cook">{'\u{1F468}\u{200D}\u{1F373}'}</span>{' '}
                    {cook}
                  </span>
                )}

                {/* Expand arrow */}
                <span className={`meals-expand-arrow ${isOpen ? 'meals-expand-arrow-open' : ''}`}>
                  {'\u{276F}'}
                </span>
              </button>

              {/* Expanded content */}
              <div className={`meals-card-body ${isOpen ? 'meals-card-body-open' : ''}`}>
                <div className="meals-card-body-inner">
                  {meal ? (
                    <div className="meals-card-details">
                      {meal.notes && (
                        <p className="meals-card-notes">{meal.notes}</p>
                      )}
                      {meal.prep_time && (
                        <div className="meals-prep-badge">
                          <span role="img" aria-label="clock">{'\u{23F1}\u{FE0F}'}</span>{' '}
                          {meal.prep_time} min bereidingstijd
                        </div>
                      )}
                      {!isTabletMode && (
                        <button
                          className="meals-edit-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingMeal(meal);
                            setShowModal(true);
                          }}
                        >
                          Bewerken
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="meals-card-details">
                      <p className="meals-card-notes meals-card-notes-empty">
                        Er is nog niets gepland voor deze dag.
                      </p>
                      {!isTabletMode && (
                        <button
                          className="meals-add-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAdd(dateStr);
                          }}
                        >
                          + Maaltijd toevoegen
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <MealModal
          meal={editingMeal}
          defaultDate={selectedDate}
          defaultType="dinner"
          onSave={handleSave}
          onDelete={editingMeal ? () => { handleDelete(editingMeal.id); setShowModal(false); setEditingMeal(null); } : null}
          onClose={() => { setShowModal(false); setEditingMeal(null); }}
        />
      )}
    </div>
  );
}
