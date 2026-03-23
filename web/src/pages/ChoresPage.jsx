import React, { useState, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { api, tabletApi } from '../utils/api';
import { usePolling } from '../hooks/usePolling';
import { toDateString } from '../utils/dateUtils';
import ChoreTemplateModal from '../components/chores/ChoreTemplateModal';

// Member color palette fallback
const MEMBER_COLORS = ['#f39e58', '#2A9D8F', '#E76F51', '#A7C957', '#7C3AED', '#06B6D4'];

function getInitial(name) {
  if (!name) return '?';
  const trimmed = name.trim();
  // Check for emoji at the start
  const emojiMatch = trimmed.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u);
  if (emojiMatch) return emojiMatch[0];
  return trimmed.charAt(0).toUpperCase();
}

export default function ChoresPage() {
  const { isTabletMode, familyMembers } = useApp();
  const [chores, setChores] = useState([]);
  const [currentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [togglingIds, setTogglingIds] = useState(new Set());

  const fetchChores = useCallback(async () => {
    try {
      const data = await (isTabletMode ? tabletApi : api).get(`/chores?date=${toDateString(currentDate)}`);
      setChores(data);
    } catch (err) {
      console.warn('Kan klusjes niet laden:', err.message);
    }
  }, [currentDate, isTabletMode]);

  usePolling(fetchChores, 30000, [toDateString(currentDate)]);

  const toggleChore = async (id) => {
    if (togglingIds.has(id)) return;
    setTogglingIds((prev) => new Set(prev).add(id));

    // Optimistic update
    setChores((prev) =>
      prev.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c))
    );

    try {
      await (isTabletMode ? tabletApi : api).patch(`/chores/${id}/toggle`);
      fetchChores();
    } catch (err) {
      console.error(err);
      // Revert optimistic update
      setChores((prev) =>
        prev.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c))
      );
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleTemplateSave = async (data) => {
    try {
      await api.post('/chores/templates', data);
      setShowModal(false);
      fetchChores();
    } catch (err) {
      alert(err.message);
    }
  };

  // Group chores by member
  const grouped = useMemo(() => {
    const map = {};
    for (const chore of chores) {
      const key = chore.member_id || 'unassigned';
      if (!map[key]) {
        map[key] = {
          member_id: chore.member_id,
          member_name: chore.member_name || 'Niet toegewezen',
          member_color: chore.member_color || MEMBER_COLORS[Object.keys(map).length % MEMBER_COLORS.length],
          chores: [],
        };
      }
      map[key].chores.push(chore);
    }
    return map;
  }, [chores]);

  const completedCount = chores.filter((c) => c.completed).length;
  const totalCount = chores.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const totalPoints = chores.filter((c) => c.completed).reduce((sum, c) => sum + (c.points || 0), 0);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="px-5 sm:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Klusjes 🧹
          </h1>
          <div className="flex items-center gap-2">
            {totalPoints > 0 && (
              <div className="bg-[var(--accent)]/15 text-[var(--accent)] font-bold px-3 py-1.5 rounded-full text-xs sm:text-sm flex items-center gap-1.5">
                <span>⭐</span>
                <span>{totalPoints}</span>
              </div>
            )}
            {!isTabletMode && (
              <button
                className="bg-[var(--accent)] hover:opacity-90 text-white font-bold px-4 py-2 rounded-full text-sm transition-all active:scale-95"
                onClick={() => setShowModal(true)}
              >
                + Klusje
              </button>
            )}
          </div>
        </div>
        <p className="text-[var(--text-muted)] text-sm mb-4">
          Wie heeft de meeste punten vandaag?
        </p>

        {/* Family progress bar */}
        {totalCount > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Familie Progressie
              </span>
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {progressPct}%
              </span>
            </div>
            <div className="h-3 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  progressPct === 100 ? 'bg-success' : 'bg-primary'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Scrollable member columns */}
      <div className="flex-1 overflow-x-auto hide-scrollbar px-5 sm:px-8 pb-8">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="text-6xl mb-4">🧹</span>
            <p className="text-[var(--text-muted)] text-lg">
              Geen klusjes voor vandaag
            </p>
            {!isTabletMode && (
              <button
                className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3 rounded-full mt-6 transition-all"
                onClick={() => setShowModal(true)}
              >
                Klusje toevoegen
              </button>
            )}
          </div>
        ) : (
          <div className="flex gap-8 min-w-max items-start">
            {Object.entries(grouped).map(([key, group]) => {
              const memberCompleted = group.chores.filter((c) => c.completed).length;
              const memberTotal = group.chores.length;
              const allDone = memberCompleted === memberTotal;
              const memberPct = Math.round((memberCompleted / memberTotal) * 100);

              return (
                <div
                  key={key}
                  className={`w-[280px] flex-shrink-0 rounded-2xl p-6 transition-all duration-500 ${
                    allDone
                      ? 'bg-success/20 border-2 border-dashed border-success/40'
                      : 'bg-[var(--bg-card)] border border-[var(--border-color)]'
                  }`}
                >
                  {/* Avatar */}
                  <div className="flex flex-col items-center mb-4">
                    <div
                      className="w-[120px] h-[120px] rounded-full border-4 border-[var(--bg-card)] flex items-center justify-center shadow-soft mb-3"
                      style={{ backgroundColor: group.member_color }}
                    >
                      <span className="text-5xl text-white font-bold select-none">
                        {getInitial(group.member_name)}
                      </span>
                    </div>

                    {/* Name */}
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center">
                      {group.member_name}
                    </h2>

                    {/* All-done celebration */}
                    {allDone && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-lg">✨</span>
                        <span className="bg-success text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          Klaar!
                        </span>
                        <span className="text-lg">✨</span>
                      </div>
                    )}

                    {/* Progress bar */}
                    <div className="w-full mt-3">
                      <div className="h-3 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ease-out ${
                            allDone ? 'bg-success' : 'bg-primary'
                          }`}
                          style={{ width: `${memberPct}%` }}
                        />
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] text-center mt-1.5 font-medium">
                        {memberCompleted}/{memberTotal} Klusjes klaar
                      </p>
                    </div>
                  </div>

                  {/* Chore cards */}
                  <div className="flex flex-col gap-3">
                    {group.chores.map((chore) => (
                      <button
                        key={chore.id}
                        onClick={() => toggleChore(chore.id)}
                        disabled={togglingIds.has(chore.id)}
                        className={`w-full rounded-xl p-4 flex items-center gap-4 transition-all duration-300 text-left ${
                          chore.completed
                            ? 'bg-success opacity-60 text-white shadow-none'
                            : 'bg-[var(--bg-primary)] shadow-soft border border-[var(--border-color)] hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                      >
                        {/* Emoji icon */}
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-xl ${
                            chore.completed
                              ? 'bg-white/20 grayscale'
                              : 'bg-[var(--bg-tertiary)]'
                          }`}
                        >
                          {chore.icon || '📋'}
                        </div>

                        {/* Title and points */}
                        <div className="flex-1 min-w-0">
                          <span
                            className={`text-lg font-bold block truncate ${
                              chore.completed
                                ? 'line-through text-white/80'
                                : 'text-[var(--text-primary)]'
                            }`}
                          >
                            {chore.title}
                          </span>
                          {chore.points > 0 && (
                            <span
                              className={`text-xs font-medium ${
                                chore.completed ? 'text-white/60' : 'text-primary'
                              }`}
                            >
                              {'★'.repeat(chore.points)} {chore.points} {chore.points === 1 ? 'punt' : 'punten'}
                            </span>
                          )}
                        </div>

                        {/* Checkbox */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                            chore.completed
                              ? 'bg-white text-success'
                              : 'border-2 border-[var(--border-color)]'
                          }`}
                        >
                          {chore.completed && (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <ChoreTemplateModal
          familyMembers={familyMembers}
          onSave={handleTemplateSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
