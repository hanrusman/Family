import React, { useState, useEffect } from 'react';
import { formatNL } from '../../utils/dateUtils';
import './IdleScreen.css';

export default function IdleScreen({ onWake }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="idle-screen" onClick={onWake} onTouchStart={onWake}>
      <div className="idle-content">
        <div className="idle-time">
          {formatNL(now, 'HH:mm')}
        </div>
        <div className="idle-date">
          {formatNL(now, 'EEEE d MMMM')}
        </div>
      </div>
      <div className="idle-hint">Tik om te activeren</div>
    </div>
  );
}
