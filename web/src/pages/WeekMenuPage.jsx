import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';
import { useActiveMenu, useMenus } from '../hooks/useMenu';
import DayCard from '../components/weekmenu/DayCard';

export default function WeekMenuPage() {
  const { isTabletMode } = useApp();
  const [tab, setTab] = useState('week');
  const navigate = useNavigate();
  const { data: activeMenu, loading, error, refresh } = useActiveMenu();
  const { menus, refresh: refreshMenus } = useMenus();

  // Admin state
  const [adminPin, setAdminPin] = useState(localStorage.getItem('weekmenu_admin_pin') || '');
  const [importJson, setImportJson] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [selectedMenuId, setSelectedMenuId] = useState(null);
  const [selectedMenu, setSelectedMenu] = useState(null);

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
      setImportMsg('Menu geïmporteerd!');
      setImportJson('');
      refresh();
      refreshMenus();
    } catch (err) {
      setImportMsg(`Fout: ${err.message}`);
    }
  };

  const deleteMenu = async (id) => {
    if (!confirm('Menu verwijderen?')) return;
    try {
      await api.delete(`/weekmenu/${id}`);
      refreshMenus();
      refresh();
      setSelectedMenuId(null);
      setSelectedMenu(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const loadSelectedMenu = async (id) => {
    setSelectedMenuId(id);
    try {
      const data = await api.get(`/weekmenu/${id}`);
      setSelectedMenu(data);
    } catch {
      setSelectedMenu(null);
    }
  };

  const handleDayClick = (day) => {
    navigate(`/recept/${day.id}`);
  };

  // Separate active/completed days
  const days = activeMenu?.days || [];
  const activeDays = days.filter((d) => d.status !== 'completed');
  const completedDays = days.filter((d) => d.status === 'completed');
  const snacks = activeMenu?.snack_suggestions ? JSON.parse(activeMenu.snack_suggestions || '[]') : [];

  const tabs = [
    { key: 'week', label: 'Deze week' },
    { key: 'recepten', label: 'Recepten' },
    ...(!isTabletMode ? [{ key: 'admin', label: 'Admin' }] : []),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab header */}
      <div className="flex items-center gap-2 p-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex-shrink-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${tab === t.key
                ? 'bg-forest-500 text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* === Week view === */}
        {tab === 'week' && (
          <div className="flex flex-col gap-4 max-w-2xl mx-auto">
            {loading && <p className="text-[var(--text-muted)] text-center py-8">Laden...</p>}
            {error && <p className="text-[var(--danger)] text-center py-8">{error}</p>}

            {!loading && !activeMenu && (
              <div className="text-center py-12">
                <p className="text-4xl mb-4">🍽️</p>
                <p className="text-[var(--text-secondary)]">Geen actief weekmenu</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Importeer een menu via de Admin tab
                </p>
              </div>
            )}

            {activeMenu && (
              <>
                <div className="text-sm text-[var(--text-muted)]">
                  Week {activeMenu.week_number}, {activeMenu.year}
                </div>

                <div className="flex flex-col gap-3">
                  {activeDays.map((day) => (
                    <DayCard key={day.id} day={day} onClick={handleDayClick} />
                  ))}
                </div>

                {completedDays.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      Afgerond
                    </div>
                    <div className="flex flex-col gap-2">
                      {completedDays.map((day) => (
                        <DayCard key={day.id} day={day} onClick={handleDayClick} compact />
                      ))}
                    </div>
                  </div>
                )}

                {snacks.length > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-[var(--bg-tertiary)]">
                    <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      🍿 Snack suggesties
                    </div>
                    <ul className="text-sm text-[var(--text-secondary)] flex flex-col gap-1">
                      {snacks.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* === Recepten tab === */}
        {tab === 'recepten' && <RecipeLibrary />}

        {/* === Admin tab === */}
        {tab === 'admin' && (
          <div className="flex flex-col gap-6 max-w-lg mx-auto">
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

            <div className="form-group">
              <label className="form-label">Menu importeren (JSON)</label>
              <textarea
                className="textarea"
                rows={6}
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='{"days": [...], "shopping_list": [...], "snack_suggestions": [...]}'
              />
              <button className="btn btn-primary btn-sm" onClick={importMenu}>
                Importeren
              </button>
              {importMsg && (
                <p className={`text-sm ${importMsg.startsWith('Fout') ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
                  {importMsg}
                </p>
              )}
            </div>

            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-2">Menu geschiedenis</h4>
              <div className="flex flex-col gap-2">
                {menus.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                      ${selectedMenuId === m.id ? 'border-forest-500 bg-forest-500/10' : 'border-[var(--border-color)] bg-[var(--bg-card)]'}`}
                    onClick={() => loadSelectedMenu(m.id)}
                  >
                    <div>
                      <span className="font-medium text-[var(--text-primary)]">Week {m.week_number}</span>
                      <span className="text-sm text-[var(--text-muted)] ml-2">{m.year}</span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full
                        ${m.status === 'active' ? 'bg-[var(--success-light)] text-[var(--success)]'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'}`}>
                        {m.status}
                      </span>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm text-[var(--danger)]"
                      onClick={(e) => { e.stopPropagation(); deleteMenu(m.id); }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {selectedMenu && (
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">
                  Week {selectedMenu.week_number} - Dagen
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(selectedMenu.days || []).map((day) => (
                    <DayCard key={day.id} day={day} compact />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RecipeLibrary() {
  const [recipes, setRecipes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  React.useEffect(() => {
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
      <div className="max-w-2xl mx-auto">
        <button
          className="btn btn-ghost btn-sm mb-4"
          onClick={() => setSelected(null)}
        >
          ← Terug
        </button>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{selected.name}</h3>
        {/* Inline simplified recipe view */}
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
    <div className="max-w-2xl mx-auto">
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

      <div className="flex flex-col gap-2">
        {recipes.map((r) => {
          const tags = r.tags ? JSON.parse(r.tags || '[]') : [];
          return (
            <div
              key={r.id}
              className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] cursor-pointer hover:border-[var(--border-light)] transition-all"
              onClick={() => setSelected(r)}
            >
              <div className="font-medium text-[var(--text-primary)]">{r.name}</div>
              <div className="flex gap-2 mt-1">
                {tags.map((tag, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                    {tag}
                  </span>
                ))}
                {r.times_used > 0 && (
                  <span className="text-xs text-[var(--text-muted)]">{r.times_used}x gemaakt</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
