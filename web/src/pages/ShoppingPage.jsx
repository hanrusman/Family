import React, { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { api, tabletApi } from '../utils/api';
import { usePolling } from '../hooks/usePolling';
import './ShoppingPage.css';

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

    // Support multiple items with comma separation
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
      // Tablet uses tabletApi for toggle (no auth needed), phone uses api
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
    <div className="shopping-page">
      <header className="shopping-header">
        <div>
          <h2>Boodschappen</h2>
          <p className="text-secondary text-sm">{uncheckedCount} items</p>
        </div>
        <div className="flex items-center gap-2">
          {checkedCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={clearChecked}>
              Opruimen ({checkedCount})
            </button>
          )}
        </div>
      </header>

      {/* Add item form */}
      {!isTabletMode && (
        <form className="shopping-add" onSubmit={addItem}>
          <input
            className="input"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Item toevoegen (gebruik komma's voor meerdere)"
          />
          <button type="submit" className="btn btn-primary">+</button>
        </form>
      )}

      <div className="shopping-content">
        {data.grouped.length === 0 ? (
          <div className="shopping-empty">
            <p className="text-secondary">Boodschappenlijst is leeg</p>
          </div>
        ) : (
          data.grouped.map((group) => (
            <div key={group.category} className="shopping-group">
              <div className="shopping-group-header">
                <span className="shopping-group-label">{group.label}</span>
                <span className="text-muted text-xs">{group.items.length}</span>
              </div>
              <div className="shopping-list">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    className={`shopping-item ${item.checked ? 'shopping-item-checked' : ''}`}
                    onClick={() => toggleItem(item.id)}
                  >
                    <span className={`shopping-check ${item.checked ? 'shopping-check-done' : ''}`}>
                      {item.checked ? '✓' : ''}
                    </span>
                    <span className="shopping-name">{item.name}</span>
                    {item.quantity && <span className="shopping-qty text-muted">{item.quantity}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}

        {checkedCount > 0 && (
          <label className="checkbox-label mt-4" style={{ justifyContent: 'center' }}>
            <input type="checkbox" checked={showChecked} onChange={(e) => setShowChecked(e.target.checked)} />
            Toon afgevinkte items
          </label>
        )}
      </div>
    </div>
  );
}
