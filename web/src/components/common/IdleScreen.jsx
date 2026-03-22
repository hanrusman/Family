import React, { useState, useEffect } from 'react';
import { formatNL, toDateString, timeString } from '../../utils/dateUtils';
import { tabletApi, api } from '../../utils/api';
import { useApp } from '../../context/AppContext';
import './IdleScreen.css';

export default function IdleScreen({ onWake }) {
  const [now, setNow] = useState(new Date());
  const [nextEvent, setNextEvent] = useState(null);
  const [todayDinner, setTodayDinner] = useState(null);
  const { isTabletMode } = useApp();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const fetcher = isTabletMode ? tabletApi : api;
        const today = toDateString(new Date());
        const tomorrow = toDateString(new Date(Date.now() + 86400000));

        // Fetch today's events
        const events = await fetcher.get(`/events?start=${today}&end=${tomorrow}`);
        const nowISO = new Date().toISOString();
        const upcoming = events
          .filter((e) => !e.all_day && e.start_time > nowISO)
          .sort((a, b) => a.start_time.localeCompare(b.start_time));

        setNextEvent(upcoming[0] || null);

        // Fetch today's dinner
        const meals = await fetcher.get(`/meals?start=${today}&end=${today}`);
        const dinner = meals.find((m) => m.meal_type === 'dinner' && m.date === today);
        setTodayDinner(dinner || null);
      } catch {
        // Silent fail on idle screen
      }
    };

    fetchInfo();
    const interval = setInterval(fetchInfo, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isTabletMode]);

  return (
    <div className="idle-screen" onClick={onWake} onTouchStart={onWake}>
      <div className="idle-content">
        <div className="idle-time">
          {formatNL(now, 'HH:mm')}
        </div>
        <div className="idle-date">
          {formatNL(now, 'EEEE d MMMM')}
        </div>

        {nextEvent && (
          <div className="idle-next-event">
            <span className="idle-event-time">{timeString(nextEvent.start_time)}</span>
            <span className="idle-event-title">{nextEvent.title}</span>
          </div>
        )}

        {todayDinner && !nextEvent && (
          <div className="idle-dinner">
            Vanavond: {todayDinner.title}
          </div>
        )}
      </div>
      <div className="idle-hint">Tik om te activeren</div>
    </div>
  );
}
