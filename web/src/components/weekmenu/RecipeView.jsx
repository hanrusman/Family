import React from 'react';

const GROUP_EMOJI = {
  groenten: '🥬', vlees: '🥩', vis: '🐟', zuivel: '🧀',
  kruiden: '🌿', granen: '🌾', noten: '🥜', fruit: '🍎',
  olie: '🫒', sauzen: '🫙', droogwaren: '📦', overig: '🛒',
};

export default function RecipeView({ recipe }) {
  if (!recipe) return null;

  const data = typeof recipe === 'string' ? JSON.parse(recipe || '{}') : recipe;
  const { ingredients = [], steps = [], nutrition_per_serving, tip } = data;

  // Group ingredients by product_group
  const grouped = {};
  for (const ing of ingredients) {
    const group = ing.product_group || 'overig';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(ing);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Nutrition summary */}
      {nutrition_per_serving && (
        <div className="flex flex-wrap gap-3 text-sm">
          {nutrition_per_serving.calories && (
            <span className="px-3 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
              🔥 {nutrition_per_serving.calories} kcal
            </span>
          )}
          {nutrition_per_serving.protein_g && (
            <span className="px-3 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
              💪 {nutrition_per_serving.protein_g}g eiwit
            </span>
          )}
          {nutrition_per_serving.fiber_g && (
            <span className="px-3 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
              🌾 {nutrition_per_serving.fiber_g}g vezels
            </span>
          )}
          {nutrition_per_serving.iron_mg && (
            <span className="px-3 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
              🩸 {nutrition_per_serving.iron_mg}mg ijzer
            </span>
          )}
        </div>
      )}

      {/* Ingredients grouped by category */}
      <div>
        <h4 className="font-semibold text-[var(--text-primary)] mb-3">Ingrediënten</h4>
        <div className="flex flex-col gap-4">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
                {GROUP_EMOJI[group] || '🛒'} {group}
              </div>
              <ul className="flex flex-col gap-1">
                {items.map((ing, i) => (
                  <li key={i} className="text-sm text-[var(--text-secondary)] pl-4">
                    {ing.amount} {ing.unit} {ing.name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Preparation steps */}
      {steps.length > 0 && (
        <div>
          <h4 className="font-semibold text-[var(--text-primary)] mb-3">Bereiding</h4>
          <ol className="flex flex-col gap-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-[var(--text-secondary)]">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-forest-500 text-white text-xs flex items-center justify-center font-bold">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Tip */}
      {tip && (
        <div className="p-3 rounded-lg bg-[var(--warning-light)] border border-[var(--warning)] text-sm text-[var(--text-primary)]">
          💡 {tip}
        </div>
      )}
    </div>
  );
}
