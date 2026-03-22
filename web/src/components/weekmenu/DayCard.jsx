import React from 'react';

const MEAL_EMOJI = {
  pasta: '🍝', rijst: '🍚', wrap: '🌯', oven: '🫕',
  salade: '🥗', vrij: '🍳', soep: '🍲', vis: '🐟',
  default: '🍽️',
};

function isToday(dayName) {
  const days = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  const today = days[new Date().getDay()];
  return dayName?.toLowerCase() === today;
}

export default function DayCard({ day, onClick, onDelete, compact }) {
  const today = isToday(day.day_name);
  const completed = day.status === 'completed';
  const emoji = MEAL_EMOJI[day.meal_type] || MEAL_EMOJI.default;
  const recipe = typeof day.recipe_data === 'string' ? JSON.parse(day.recipe_data || '{}') : (day.recipe_data || {});

  return (
    <div
      className={`relative rounded-xl p-4 cursor-pointer transition-all border
        ${today ? 'border-forest-500 bg-forest-500/10 dark:bg-forest-500/20' : 'border-[var(--border-color)] bg-[var(--bg-card)]'}
        ${completed ? 'opacity-60' : ''}
        hover:shadow-md`}
      onClick={() => onClick?.(day)}
    >
      {today && (
        <span className="absolute top-2 right-2 text-xs font-bold uppercase tracking-wider text-forest-500">
          Vandaag
        </span>
      )}

      <div className="flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
            {day.day_name}
          </div>
          <div className={`font-semibold text-[var(--text-primary)] ${completed ? 'line-through' : ''}`}>
            {day.recipe_name}
          </div>
        </div>
      </div>

      {!compact && (
        <div className="flex gap-3 mt-2 text-xs text-[var(--text-muted)]">
          {day.prep_time_minutes && <span>⏱ {day.prep_time_minutes} min</span>}
          {day.cost_index && <span>{day.cost_index}</span>}
          {day.meal_type && <span className="capitalize">{day.meal_type}</span>}
          {recipe?.nutrition_per_serving?.calories && (
            <span>{recipe.nutrition_per_serving.calories} kcal</span>
          )}
        </div>
      )}

      {onDelete && (
        <button
          className="absolute top-2 left-2 text-xs text-[var(--danger)] opacity-0 hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onDelete(day); }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
