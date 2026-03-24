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

  const clearAll = async () => {
    if (!confirm('Alle boodschappen wissen? De hele lijst wordt leeggemaakt.')) return;
    try {
      await api.delete('/shopping/all/clear');
      fetchItems();
    } catch (err) {
      alert(err.message);
    }
  };

  const uncheckedCount = data.items.filter((i) => !i.checked).length;
  const checkedCount = data.items.filter((i) => i.checked).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="px-5 sm:px-8 pt-6 pb-4 shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
                Boodschappen 🛒
              </h1>
              <p className="text-[var(--text-muted)] text-sm mt-0.5">
                {uncheckedCount} {uncheckedCount === 1 ? 'item' : 'items'} op de lijst
              </p>
            </div>
            <div className="flex gap-2">
              {uncheckedCount > 0 && (
                <button
                  className="bg-[var(--success)] px-4 py-2 rounded-full text-sm font-bold text-white hover:opacity-90 transition-all active:scale-95"
                  onClick={clearAll}
                >
                  ✓ Boodschappen gedaan
                </button>
              )}
              {checkedCount > 0 && (
                <button
                  className="bg-[var(--bg-card)] px-3 py-2 rounded-full text-xs font-semibold text-[var(--text-muted)] border border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors active:scale-95"
                  onClick={clearChecked}
                >
                  Opruimen ({checkedCount})
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Add item form */}
      {!isTabletMode && (
        <div className="px-5 sm:px-8 pb-3">
          <form className="max-w-2xl mx-auto flex gap-2" onSubmit={addItem}>
            <input
              className="flex-1 px-4 py-2.5 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Toevoegen (komma's voor meerdere)"
            />
            <button
              type="submit"
              className="w-11 h-11 bg-[var(--accent)] text-white rounded-xl flex items-center justify-center text-xl font-bold hover:opacity-90 transition-all active:scale-95 shrink-0"
            >
              +
            </button>
          </form>
        </div>
      )}

      {/* Shopping list */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-8 pb-32">
        <div className="max-w-2xl mx-auto flex flex-col gap-5 pt-1">
          {data.grouped.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-[var(--text-muted)] text-base">Boodschappenlijst is leeg</p>
            </div>
          ) : (
            data.grouped.map((group) => (
              <div key={group.category}>
                {/* Category header */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-lg">{CATEGORY_EMOJI[group.category] || '🛒'}</span>
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    {group.label}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">{group.items.length}</span>
                </div>

                {/* Items */}
                <div className="flex flex-col gap-1.5">
                  {group.items.map((item) => {
                    const qty = parseInt(item.quantity) || 1;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 bg-[var(--bg-card)] rounded-xl px-4 py-3 transition-all border ${
                          item.checked
                            ? 'border-[var(--success)]/20 opacity-50'
                            : 'border-[var(--border-color)]'
                        }`}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleItem(item.id)}
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                            item.checked
                              ? 'bg-[var(--success)] border-[var(--success)] text-white'
                              : 'border-[var(--border-color)] hover:border-[var(--accent)]'
                          }`}
                        >
                          {item.checked && <span className="text-xs font-bold">✓</span>}
                        </button>

                        {/* Item name + optional quantity display */}
                        <span
                          className={`text-base font-medium flex-1 min-w-0 truncate ${
                            item.checked
                              ? 'line-through text-[var(--text-muted)]'
                              : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {item.name}
                          {qty > 1 && !item.checked && (
                            <span className="text-[var(--text-muted)] text-sm ml-1">
                              ({qty}×)
                            </span>
                          )}
                        </span>

                        {/* Quantity controls — only for unchecked items */}
                        {!item.checked && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => updateQuantity(item, -1)}
                              className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] flex items-center justify-center font-bold transition-colors active:scale-90"
                              title={qty <= 1 ? 'Verwijderen' : 'Minder'}
                            >
                              {qty <= 1 ? '🗑' : '−'}
                            </button>
                            <button
                              onClick={() => updateQuantity(item, 1)}
                              className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 flex items-center justify-center font-bold transition-colors active:scale-90"
                              title="Meer"
                            >
                              +
                            </button>
                          </div>
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
            <button
              onClick={() => setShowChecked(!showChecked)}
              className="text-[var(--text-secondary)] text-sm font-medium py-3 hover:text-[var(--text-primary)] transition-colors"
            >
              {showChecked ? 'Verberg' : 'Toon'} afgevinkte items ({checkedCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
