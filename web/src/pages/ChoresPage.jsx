import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api, tabletApi } from '../utils/api';
import { usePolling } from '../hooks/usePolling';
import { toDateString } from '../utils/dateUtils';
import ChoreTemplateModal from '../components/chores/ChoreTemplateModal';

// Member color palette fallback
const MEMBER_COLORS = ['#f39e58', '#2A9D8F', '#E76F51', '#A7C957', '#7C3AED', '#06B6D4'];

const TIME_LABELS = {
  before_school: { label: 'Ochtendmissies', emoji: '🌅', order: 0 },
  after_school:  { label: 'Middagmissies',  emoji: '☀️', order: 1 },
  before_bed:    { label: 'Avondmissies',   emoji: '🌙', order: 2 },
  anytime:       { label: 'Flexmissies',    emoji: '⚡', order: 3 },
};

const PROGRESS_MESSAGES = [
  { min: 0,   max: 0,   messages: ['Klaar voor de start! 🚀'] },
  { min: 1,   max: 24,  messages: ['Lekker bezig! 💪', 'Goed begin! 🌟'] },
  { min: 25,  max: 49,  messages: ['Halverwege! 🔥', 'Doorgaan! 💫'] },
  { min: 50,  max: 74,  messages: ['Meer dan de helft! 🎯', 'Super gedaan! ⭐'] },
  { min: 75,  max: 99,  messages: ['Bijna klaar! 🏆', 'Nog even volhouden! 🌈'] },
  { min: 100, max: 100, messages: ['Alles klaar! 🎉', 'Fantastisch gedaan! 🥇'] },
];

function getProgressMessage(pct) {
  const bucket = PROGRESS_MESSAGES.find((b) => pct >= b.min && pct <= b.max);
  if (!bucket) return '';
  return bucket.messages[Math.floor(Math.random() * bucket.messages.length)];
}

function ConfettiBurst() {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    angle: (360 / 12) * i,
    distance: 30 + Math.random() * 20,
    color: ['#f39e58', '#2A9D8F', '#E76F51', '#A7C957', '#7C3AED', '#06B6D4'][i % 6],
    size: 4 + Math.random() * 4,
    delay: Math.random() * 0.3,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute top-1/2 left-1/2 rounded-full animate-confetti-burst"
          style={{
            '--angle': `${p.angle}deg`,
            '--distance': `${p.distance}px`,
            '--color': p.color,
            '--size': `${p.size}px`,
            width: 'var(--size)',
            height: 'var(--size)',
            backgroundColor: 'var(--color)',
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-burst {
          0% { transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(var(--angle)) translateY(calc(-1 * var(--distance))) scale(0); opacity: 0; }
        }
        .animate-confetti-burst {
          animation: confetti-burst 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

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
  const [streaks, setStreaks] = useState({});
  const [justCompleted, setJustCompleted] = useState(new Set());
  const [justCompletedAll, setJustCompletedAll] = useState(new Set());
  const prevChoresRef = useRef({});

  const fetchStreaks = useCallback(async () => {
    try {
      const data = await (isTabletMode ? tabletApi : api).get('/chores/streaks');
      setStreaks(data);
    } catch (err) {
      console.warn('Kan streaks niet laden:', err.message);
    }
  }, [isTabletMode]);

  useEffect(() => {
    fetchStreaks();
  }, [fetchStreaks]);

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

    const chore = chores.find((c) => c.id === id);
    const wasCompleted = chore?.completed;

    // Optimistic update
    setChores((prev) =>
      prev.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c))
    );

    // Show confetti animation when completing (not uncompleting)
    if (!wasCompleted) {
      setJustCompleted((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setJustCompleted((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 800);
    }

    try {
      await (isTabletMode ? tabletApi : api).patch(`/chores/${id}/toggle`);
      fetchChores();
      fetchStreaks();
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

  // Track "all done" celebrations per member
  useEffect(() => {
    Object.entries(grouped).forEach(([key, group]) => {
      const allDone = group.chores.length > 0 && group.chores.every((c) => c.completed);
      const wasAllDone = prevChoresRef.current[key];
      if (allDone && !wasAllDone) {
        setJustCompletedAll((prev) => new Set(prev).add(key));
        setTimeout(() => {
          setJustCompletedAll((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }, 2000);
      }
    });
    const snapshot = {};
    Object.entries(grouped).forEach(([key, group]) => {
      snapshot[key] = group.chores.length > 0 && group.chores.every((c) => c.completed);
    });
    prevChoresRef.current = snapshot;
  }, [grouped]);

  // Collect family roles from chore role_titles
  const familyRoles = useMemo(() => {
    const roles = new Set();
    chores.forEach((c) => {
      if (c.role_title) roles.add(c.role_title);
    });
    return [...roles];
  }, [chores]);

  const completedCount = chores.filter((c) => c.completed).length;
  const totalCount = chores.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="px-5 sm:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Missies van Vandaag 🎯
          </h1>
          <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <p className="text-[var(--text-muted)] text-sm">
            {getProgressMessage(progressPct)}
          </p>
          {familyRoles.map((role) => (
            <span
              key={role}
              className="bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-semibold px-2 py-0.5 rounded-full"
            >
              {role}
            </span>
          ))}
        </div>

        {/* Family progress bar */}
        {totalCount > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Familiescore
              </span>
              <span className="text-2xl font-black text-[var(--text-primary)]">
                {progressPct}%
              </span>
            </div>
            <div className="h-3 bg-[var(--bg-tertiary)] rounded-full overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  progressPct === 100 ? 'bg-success' : 'bg-primary'
                }`}
                style={{ width: `${progressPct}%` }}
              />
              {progressPct > 0 && progressPct < 100 && (
                <div
                  className="absolute top-0 h-full w-8 rounded-full opacity-40"
                  style={{
                    left: `${Math.max(0, progressPct - 4)}%`,
                    background: 'linear-gradient(90deg, transparent, white, transparent)',
                    animation: 'progress-shine 2s ease-in-out infinite',
                  }}
                />
              )}
            </div>
            <style>{`
              @keyframes progress-shine {
                0%, 100% { opacity: 0; }
                50% { opacity: 0.4; }
              }
            `}</style>
          </div>
        )}
      </header>

      {/* Scrollable member columns */}
      <div className="flex-1 overflow-x-auto hide-scrollbar px-5 sm:px-8 pb-8">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="text-6xl mb-4">🚀</span>
            <p className="text-[var(--text-muted)] text-lg">
              Nog geen missies!
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
              const memberStreak = streaks[group.member_id] || 0;

              // Group chores by time_of_day
              const choresByTime = {};
              group.chores.forEach((chore) => {
                const timeKey = chore.time_of_day || 'anytime';
                if (!choresByTime[timeKey]) choresByTime[timeKey] = [];
                choresByTime[timeKey].push(chore);
              });
              const sortedTimeSections = Object.entries(choresByTime).sort(
                ([a], [b]) => (TIME_LABELS[a]?.order ?? 99) - (TIME_LABELS[b]?.order ?? 99)
              );

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
                    <div className="relative">
                      <div
                        className="w-[100px] h-[100px] rounded-full border-4 border-[var(--bg-card)] flex items-center justify-center shadow-soft mb-3"
                        style={{ backgroundColor: group.member_color }}
                      >
                        <span className="text-4xl text-white font-bold select-none">
                          {getInitial(group.member_name)}
                        </span>
                      </div>
                      {memberStreak > 0 && (
                        <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-md">
                          <span>🔥</span>
                          <span>{memberStreak}</span>
                        </div>
                      )}
                      {justCompletedAll.has(key) && <ConfettiBurst />}
                    </div>

                    {/* Name */}
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] text-center">
                      {group.member_name}
                    </h2>

                    {/* All-done celebration */}
                    {allDone && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-lg">🎉</span>
                        <span className="bg-success text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          Alles klaar!
                        </span>
                        <span className="text-lg">🎉</span>
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

                  {/* Chore cards grouped by time */}
                  <div className="flex flex-col gap-3">
                    {sortedTimeSections.map(([timeKey, timeChores]) => {
                      const timeInfo = TIME_LABELS[timeKey] || TIME_LABELS.anytime;
                      return (
                        <div key={timeKey}>
                          <div className="flex items-center gap-1.5 mb-2 mt-1">
                            <span className="text-sm">{timeInfo.emoji}</span>
                            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                              {timeInfo.label}
                            </span>
                          </div>
                          {timeChores.map((chore) => (
                            <button
                              key={chore.id}
                              onClick={() => toggleChore(chore.id)}
                              disabled={togglingIds.has(chore.id)}
                              className={`relative w-full rounded-xl p-4 flex items-center gap-4 transition-all duration-300 text-left mb-2 ${
                                chore.completed
                                  ? 'bg-success opacity-60 text-white shadow-none'
                                  : 'bg-[var(--bg-primary)] shadow-soft border border-[var(--border-color)] hover:scale-[1.02] active:scale-[0.98]'
                              }`}
                            >
                              {/* Emoji icon */}
                              <div
                                className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${
                                  chore.completed
                                    ? 'bg-white/20 grayscale'
                                    : 'bg-[var(--bg-tertiary)]'
                                }`}
                              >
                                {chore.completed ? '✅' : (chore.icon || '📋')}
                              </div>

                              {/* Title, role, and points */}
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
                                {chore.role_title && (
                                  <span
                                    className={`text-xs font-medium block ${
                                      chore.completed ? 'text-white/50' : 'text-[var(--text-muted)]'
                                    }`}
                                  >
                                    {chore.role_title}
                                  </span>
                                )}
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

                              {/* Confetti burst on completion */}
                              {justCompleted.has(chore.id) && <ConfettiBurst />}
                            </button>
                          ))}
                        </div>
                      );
                    })}
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
