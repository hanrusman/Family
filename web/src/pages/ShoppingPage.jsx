import React, { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { api, tabletApi } from '../utils/api';
import { usePolling } from '../hooks/usePolling';

const CATEGORY_EMOJI = {
  groente_fruit: '🥬', zuivel: '🥛', vlees_vis: '🥩',
  brood_bakkerij: '🥖', dranken: '🥤', conserven: '🥫',
  diepvries: '🧊', huishouden: '🧹', verzorging: '🧴',
  overig: '🛒', kruiden: '🌿', sauzen: '🫙',
};

export default function ShoppingPage() {
  const { isTabletMode } = useApp();
  const [data, setData] = useState({ items: [], grouped: [], categories: {} });
  const [newItem, setNewItem] = useState('');
  const [showChecked, setShowChecked] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const fetcher = isTabletMode ? tabletApi : api;
      const result = await fetcher.get(`/shopping?show_checked=${showChecked}`);
      setData(result);
    } catch (err) {
      console.warn('Kan boodschappen niet laden:', err.message);
    }
  }, [showChecked, isTabletMode]);

  usePolling(fetchItems, 15000, [showChecked]);

  const addItem = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    const items = newItem.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      if (items.length === 1) {
        await api.post('/shopping', { name: items[0], quantity: '1' });
      } else {
        await api.post('/shopping/bulk', { items: items.map((name) => ({ name, quantity: '1' })) });
      }
      setNewItem('');
      fetchItems();
    } catch (err) {
      alert(err.message);
    }
  };

  const updateQuantity = async (item, delta) => {
    const currentQty = parseInt(item.quantity) || 1;
    const newQty = currentQty + delta;

    if (newQty < 1) {
      // Verwijder item
      try {
        await api.delete(`/shopping/${item.id}`);
        fetchItems();
      } catch (err) {
        console.error(err);
      }
      return;
    }

    try {
      await api.patch(`/shopping/${item.id}`, { quantity: String(newQty) });
      // Optimistic update
      setData((prev) => ({
        ...prev,
        items: prev.items.map((i) => i.id === item.id ? { ...i, quantity: String(newQty) } : i),
        grouped: prev.grouped.map((g) => ({
          ...g,
          items: g.items.map((i) => i.id === item.id ? { ...i, quantity: String(newQty) } : i),
        })),
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleItem = async (id) => {
    try {
      const fetcher = isTabletMode ? tabletApi : api;
      await fetcher.patch(`/shopping/${id}/toggle`);
      fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  const clearChecked = async () => {
    try {
      await api.delete('/shopping/checked/clear');
      fetchItems();
    } catch (err) {
      alert(err.message);
    }
  };

  const uncheckedCount = data.items.filter((i) => !i.checked).length;
  const checkedCount = data.items.filter((i) => i.checked).length;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="w-full px-8 py-6 shrink-0">
        <div className="max-w-3xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Boodschappen 🛒
            </h1>
            <p className="text-[var(--text-secondary)] text-lg font-medium mt-1">
              {uncheckedCount} items op de lijst
            </p>
          </div>
          <div className="flex items-center gap-3">
            {checkedCount > 0 && (
              <button
                className="bg-[var(--bg-card)] px-5 py-2.5 rounded-full shadow-soft font-bold text-[var(--text-primary)] text-sm border border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors active:scale-95"
                onClick={clearChecked}
              >
                Opruimen ({checkedCount})
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Add item form */}
      {!isTabletMode && (
        <div className="px-8 pb-4">
          <form className="max-w-3xl mx-auto flex gap-3" onSubmit={addItem}>
            <input
              className="flex-1 px-5 py-3 bg-[var(--bg-input)] rounded-full border border-[var(--border-color)] shadow-soft text-lg font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary transition-colors"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Item toevoegen (komma's voor meerdere)"
            />
            <button
              type="submit"
              className="w-12 h-12 bg-primary text-white rounded-full shadow-soft flex items-center justify-center text-2xl font-bold hover:bg-primary/90 transition-colors active:scale-95"
            >
              +
            </button>
          </form>
        </div>
      )}

      {/* Shopping content */}
      <div className="flex-1 overflow-y-auto px-8 pb-32">
        <div className="max-w-3xl mx-auto flex flex-col gap-6 pt-2">
          {data.grouped.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-[var(--text-muted)] text-lg font-medium">Boodschappenlijst is leeg</p>
            </div>
          ) : (
            data.grouped.map((group) => (
              <div key={group.category}>
                {/* Category header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{CATEGORY_EMOJI[group.category] || '🛒'}</span>
                  <span className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    {group.label}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] font-medium">{group.items.length}</span>
                </div>

                {/* Items */}
                <div className="flex flex-col gap-2">
                  {group.items.map((item) => {
                    const qty = parseInt(item.quantity) || 1;
                    return (
                      <div
                        key={item.id}
                        className={`w-full flex items-center gap-3 bg-[var(--bg-card)] rounded-lg p-3 transition-all border ${
                          item.checked
                            ? 'border-success/30 opacity-50'
                            : 'border-[var(--border-color)]'
                        }`}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleItem(item.id)}
                          className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                            item.checked
                              ? 'bg-success border-success text-white'
                              : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-primary'
                          }`}
                        >
                          {item.checked && <span className="text-sm font-bold">✓</span>}
                        </button>

                        {/* Item name */}
                        <span
                          className={`text-lg font-bold flex-1 ${
                            item.checked
                              ? 'line-through text-[var(--text-muted)]'
                              : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {item.name}
                        </span>

                        {/* Quantity controls */}
                        {!item.checked && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => updateQuantity(item, -1)}
                              className="w-8 h-8 rounded-full bg-[var(--bg-tertiary,var(--bg-hover))] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] flex items-center justify-center font-bold text-lg transition-colors active:scale-90"
                              title={qty <= 1 ? 'Verwijderen' : 'Minder'}
                            >
                              {qty <= 1 ? '🗑' : '−'}
                            </button>
                            <span className="w-8 text-center font-bold text-[var(--text-primary)] text-sm tabular-nums">
                              {qty}
                            </span>
                            <button
                              onClick={() => updateQuantity(item, 1)}
                              className="w-8 h-8 rounded-full bg-primary/15 text-primary hover:bg-primary/25 flex items-center justify-center font-bold text-lg transition-colors active:scale-90"
                              title="Meer"
                            >
                              +
                            </button>
                          </div>
                        )}

                        {/* Show quantity for checked items */}
                        {item.checked && qty > 1 && (
                          <span className="text-sm font-medium text-[var(--text-muted)]">×{qty}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {/* Toggle checked items */}
          {checkedCount > 0 && (
            <label className="flex items-center justify-center gap-3 py-4 cursor-pointer">
              <input
                type="checkbox"
                checked={showChecked}
                onChange={(e) => setShowChecked(e.target.checked)}
                className="w-5 h-5 rounded border-[var(--border-color)] text-primary focus:ring-primary"
              />
              <span className="text-[var(--text-secondary)] font-medium">
                Toon afgevinkte items
              </span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
