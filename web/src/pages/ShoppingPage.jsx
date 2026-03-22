import React, { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { api, tabletApi } from '../utils/api';
import { usePolling } from '../hooks/usePolling';

const CATEGORY_EMOJI = {
  groenten: '🥬', fruit: '🍎', zuivel: '🥛', vlees: '🥩', vis: '🐟',
  brood: '🥖', dranken: '🥤', snacks: '🍿', pasta: '🍝', rijst: '🍚',
  conserven: '🥫', diepvries: '🧊', huishouden: '🧹', verzorging: '🧴',
  overig: '🛒', kruiden: '🌿', sauzen: '🫙', kaas: '🧀', eieren: '🥚',
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
        await api.post('/shopping', { name: items[0] });
      } else {
        await api.post('/shopping/bulk', { items: items.map((name) => ({ name })) });
      }
      setNewItem('');
      fetchItems();
    } catch (err) {
      alert(err.message);
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
    <div className="flex flex-col h-full bg-background-light">
      {/* Header */}
      <header className="w-full px-8 py-6 shrink-0">
        <div className="max-w-3xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-main">
              Boodschappen 🛒
            </h1>
            <p className="text-text-main/70 text-lg font-medium mt-1">
              {uncheckedCount} items op de lijst
            </p>
          </div>
          <div className="flex items-center gap-3">
            {checkedCount > 0 && (
              <button
                className="bg-white px-5 py-2.5 rounded-full shadow-soft font-bold text-text-main text-sm border border-muted/50 hover:bg-background-light transition-colors active:scale-95"
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
              className="flex-1 px-5 py-3 bg-white rounded-full border border-muted shadow-soft text-lg font-medium text-text-main placeholder:text-text-main/40 focus:outline-none focus:border-primary transition-colors"
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
              <p className="text-text-main/50 text-lg font-medium">Boodschappenlijst is leeg</p>
            </div>
          ) : (
            data.grouped.map((group) => (
              <div key={group.category}>
                {/* Category header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{CATEGORY_EMOJI[group.category] || '🛒'}</span>
                  <span className="text-sm font-bold text-text-main/50 uppercase tracking-wider">
                    {group.label}
                  </span>
                  <span className="text-xs text-text-main/40 font-medium">{group.items.length}</span>
                </div>

                {/* Items */}
                <div className="flex flex-col gap-2">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      className={`w-full flex items-center gap-4 bg-white rounded-lg p-4 text-left transition-all active:scale-[0.98] border ${
                        item.checked
                          ? 'border-success/30 opacity-50'
                          : 'border-muted/50 hover:border-primary/30 hover:shadow-soft'
                      }`}
                      onClick={() => toggleItem(item.id)}
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                          item.checked
                            ? 'bg-success border-success text-white'
                            : 'border-muted bg-white'
                        }`}
                      >
                        {item.checked && (
                          <span className="text-sm font-bold">✓</span>
                        )}
                      </div>

                      {/* Item name */}
                      <span
                        className={`text-lg font-bold flex-1 ${
                          item.checked
                            ? 'line-through text-text-main/50'
                            : 'text-text-main'
                        }`}
                      >
                        {item.name}
                      </span>

                      {/* Quantity */}
                      {item.quantity && (
                        <span className="text-sm font-medium text-text-main/50">
                          {item.quantity}
                        </span>
                      )}
                    </button>
                  ))}
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
                className="w-5 h-5 rounded border-muted text-primary focus:ring-primary"
              />
              <span className="text-text-main/60 font-medium">
                Toon afgevinkte items
              </span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
