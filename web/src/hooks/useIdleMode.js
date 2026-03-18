import { useState, useEffect, useCallback, useRef } from 'react';

export function useIdleMode(timeoutMinutes = 5) {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef(null);

  const resetTimer = useCallback(() => {
    if (isIdle) setIsIdle(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, timeoutMinutes * 60 * 1000);
  }, [timeoutMinutes, isIdle]);

  const wake = useCallback(() => {
    setIsIdle(false);
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    const events = ['touchstart', 'mousedown', 'mousemove', 'keydown', 'scroll'];

    const handler = () => resetTimer();

    events.forEach((event) => {
      document.addEventListener(event, handler, { passive: true });
    });

    resetTimer();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handler);
      });
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  return { isIdle, wake };
}
