import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveMenu } from '../hooks/useMenu';
import DayCard from '../components/weekmenu/DayCard';

export default function WeekMenuPage() {
  const navigate = useNavigate();
  const { data: activeMenu, loading, error } = useActiveMenu();

  const handleDayClick = (day) => {
    navigate(`/recept/${day.id}`);
  };

  const days = activeMenu?.days || [];
  const activeDays = days.filter((d) => d.status !== 'completed');
  const completedDays = days.filter((d) => d.status === 'completed');
  const snacks = activeMenu?.snack_suggestions ? JSON.parse(activeMenu.snack_suggestions || '[]') : [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 pb-28">
        <div className="flex flex-col gap-4 max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Menu van deze week</h1>
              <p className="text-sm text-[var(--text-muted)]">Wat eten we vandaag?</p>
            </div>
            {activeMenu && (
              <span className="text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-3 py-1.5 rounded-full">
                Week {activeMenu.week_number}
              </span>
            )}
          </div>

          {loading && <p className="text-[var(--text-muted)] text-center py-8">Laden...</p>}
          {error && <p className="text-[var(--danger)] text-center py-8">{error}</p>}

          {!loading && !activeMenu && (
            <div className="text-center py-12">
              <p className="text-4xl mb-4">🍽️</p>
              <p className="text-[var(--text-secondary)]">Geen actief weekmenu</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Importeer een menu via Papa & Mama (Instellingen)
              </p>
            </div>
          )}

          {activeMenu && (
            <>
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
      </div>
    </div>
  );
}
