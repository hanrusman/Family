import React, { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { api, tabletApi } from '../utils/api';
import { usePolling } from '../hooks/usePolling';
import {
  toDateString, formatNL, getWeekDays, isToday, MEAL_TYPE_LABELS,
} from '../utils/dateUtils';
import MealModal from '../components/meals/MealModal';
import './MealsPage.css';

export default function MealsPage() {
  const { isTabletMode } = useApp();
  const [currentDate] = useState(new Date());
  const [meals, setMeals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  const weekDays = getWeekDays(currentDate);
  const weekStart = toDateString(weekDays[0]);
  const weekEnd = toDateString(weekDays[6]);

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

  const todayMeal = meals.find(
    (m) => m.date === toDateString(currentDate) && m.meal_type === 'dinner'
  );

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

  const openAdd = (date, type) => {
    setSelectedDate(date);
    setSelectedType(type);
    setEditingMeal(null);
    setShowModal(true);
  };

  const getMeal = (dateStr, type) => meals.find((m) => m.date === dateStr && m.meal_type === type);

  return (
    <div className="meals-page">
      <header className="meals-header">
        <div>
          <h2>Weekmenu</h2>
          <p className="text-secondary text-sm">
            {formatNL(weekDays[0], 'd MMM')} – {formatNL(weekDays[6], 'd MMM yyyy')}
          </p>
        </div>
      </header>

      {/* Today's highlight */}
      {todayMeal && (
        <div className="today-meal">
          <span className="today-meal-label">Vanavond eten we:</span>
          <span className="today-meal-title">{todayMeal.title}</span>
        </div>
      )}

      <div className="meals-content">
        <div className="meals-grid">
          {/* Header */}
          <div className="meals-grid-header">
            <div className="meals-day-col" />
            {Object.entries(MEAL_TYPE_LABELS).map(([key, label]) => (
              <div key={key} className="meals-type-col">{label}</div>
            ))}
          </div>

          {/* Days */}
          {weekDays.map((day) => {
            const dateStr = toDateString(day);
            const today = isToday(day);

            return (
              <div key={dateStr} className={`meals-row ${today ? 'meals-row-today' : ''}`}>
                <div className="meals-day-col">
                  <span className="meals-day-name" style={{ textTransform: 'capitalize' }}>
                    {formatNL(day, 'EEE')}
                  </span>
                  <span className={`meals-day-number ${today ? 'today-badge' : ''}`}>
                    {formatNL(day, 'd')}
                  </span>
                </div>

                {['breakfast', 'lunch', 'dinner'].map((type) => {
                  const meal = getMeal(dateStr, type);
                  return (
                    <div
                      key={type}
                      className={`meals-cell ${meal ? 'meals-cell-filled' : ''}`}
                      onClick={() => {
                        if (isTabletMode) return;
                        if (meal) {
                          setEditingMeal(meal);
                          setShowModal(true);
                        } else {
                          openAdd(dateStr, type);
                        }
                      }}
                    >
                      {meal ? (
                        <span className="meal-title">{meal.title}</span>
                      ) : (
                        !isTabletMode && <span className="meal-add">+</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <MealModal
          meal={editingMeal}
          defaultDate={selectedDate}
          defaultType={selectedType}
          onSave={handleSave}
          onDelete={editingMeal ? () => { handleDelete(editingMeal.id); setShowModal(false); setEditingMeal(null); } : null}
          onClose={() => { setShowModal(false); setEditingMeal(null); }}
        />
      )}
    </div>
  );
}
