import React, { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { api, tabletApi } from '../utils/api';
import { usePolling } from '../hooks/usePolling';
import { toDateString, formatNL, isToday, TIME_OF_DAY_LABELS } from '../utils/dateUtils';
import ChoreTemplateModal from '../components/chores/ChoreTemplateModal';
import './ChoresPage.css';

export default function ChoresPage() {
  const { isTabletMode, familyMembers } = useApp();
  const [chores, setChores] = useState([]);
  const [stats, setStats] = useState([]);
  const [currentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);

  const fetchChores = useCallback(async () => {
    try {
      const data = await (isTabletMode ? tabletApi : api).get(`/chores?date=${toDateString(currentDate)}`);
      setChores(data);
    } catch (err) {
      console.warn('Kan klusjes niet laden:', err.message);
    }
  }, [currentDate, isTabletMode]);

  const fetchStats = useCallback(async () => {
    if (isTabletMode) return;
    try {
      const data = await api.get('/chores/stats');
      setStats(data);
    } catch (err) {
      console.warn('Kan klusjes-stats niet laden:', err.message);
    }
  }, [isTabletMode]);

  usePolling(fetchChores, 30000, [toDateString(currentDate)]);
  usePolling(fetchStats, 60000, []);

  const toggleChore = async (id) => {
    try {
      await (isTabletMode ? tabletApi : api).patch(`/chores/${id}/toggle`);
      fetchChores();
    } catch (err) {
      console.error(err);
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
  const grouped = {};
  for (const chore of chores) {
    const key = chore.member_id || 'unassigned';
    if (!grouped[key]) {
      grouped[key] = {
        member_name: chore.member_name || 'Niet toegewezen',
        member_color: chore.member_color || 'var(--text-muted)',
        chores: [],
      };
    }
    grouped[key].chores.push(chore);
  }

  const completedCount = chores.filter((c) => c.completed).length;
  const totalCount = chores.length;

  return (
    <div className="chores-page">
      <header className="chores-header">
        <div>
          <h2>Klusjes</h2>
          <p className="text-secondary text-sm" style={{ textTransform: 'capitalize' }}>
            {formatNL(currentDate, 'EEEE d MMMM')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {totalCount > 0 && (
            <div className="chores-progress">
              <div className="chores-progress-bar" style={{ width: `${(completedCount / totalCount) * 100}%` }} />
              <span className="chores-progress-text">{completedCount}/{totalCount}</span>
            </div>
          )}
          {!isTabletMode && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Klusje</button>
          )}
        </div>
      </header>

      <div className="chores-content">
        {totalCount === 0 ? (
          <div className="chores-empty">
            <p className="text-secondary">Geen klusjes voor vandaag</p>
            {!isTabletMode && (
              <button className="btn btn-primary mt-4" onClick={() => setShowModal(true)}>Klusje toevoegen</button>
            )}
          </div>
        ) : (
          Object.entries(grouped).map(([key, group]) => (
            <div key={key} className="chore-group">
              <div className="chore-group-header">
                <span className="chore-group-dot" style={{ backgroundColor: group.member_color }} />
                <span className="chore-group-name">{group.member_name}</span>
                <span className="text-muted text-sm">
                  {group.chores.filter((c) => c.completed).length}/{group.chores.length}
                </span>
              </div>
              <div className="chore-list">
                {group.chores.map((chore) => (
                  <button
                    key={chore.id}
                    className={`chore-item ${chore.completed ? 'chore-done' : ''}`}
                    onClick={() => toggleChore(chore.id)}
                  >
                    <span className={`chore-check ${chore.completed ? 'chore-check-done animate-check' : ''}`}>
                      {chore.completed ? '✓' : ''}
                    </span>
                    <span className="chore-icon">{chore.icon}</span>
                    <div className="chore-info">
                      <span className="chore-title">{chore.title}</span>
                      {chore.time_of_day !== 'anytime' && (
                        <span className="chore-time text-muted text-xs">
                          {TIME_OF_DAY_LABELS[chore.time_of_day] || chore.time_of_day}
                        </span>
                      )}
                    </div>
                    {chore.points > 0 && (
                      <span className="chore-points">{'★'.repeat(chore.points)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Stats voor ouders */}
        {!isTabletMode && stats.length > 0 && (
          <div className="chore-stats">
            <h3>Weekoverzicht</h3>
            <div className="stats-grid">
              {stats.map((stat) => (
                <div key={stat.member_id || 'none'} className="stat-card card">
                  <div className="stat-name" style={{ color: stat.member_color }}>
                    {stat.member_name || 'Niet toegewezen'}
                  </div>
                  <div className="stat-numbers">
                    <span className="stat-completed">{stat.completed || 0}/{stat.total}</span>
                    <span className="stat-points">{'★'} {stat.points || 0} punten</span>
                  </div>
                </div>
              ))}
            </div>
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
