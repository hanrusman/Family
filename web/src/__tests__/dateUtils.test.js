import { describe, test, expect } from 'vitest';
import {
  getWeekDays,
  getMonthDays,
  getTimePosition,
  getEventHeight,
  toDateString,
  timeString,
  DAY_NAMES_SHORT,
  MEAL_TYPE_LABELS,
} from '../utils/dateUtils';

describe('dateUtils', () => {
  test('getWeekDays returns 7 days starting from Monday', () => {
    const days = getWeekDays(new Date('2026-03-18'));
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(1); // Monday
    expect(days[6].getDay()).toBe(0); // Sunday
  });

  test('getMonthDays returns full calendar grid', () => {
    const days = getMonthDays(new Date('2026-03-01'));
    expect(days.length).toBeGreaterThanOrEqual(28);
    expect(days.length % 7).toBe(0); // Always full weeks
  });

  test('getTimePosition calculates correct percentage', () => {
    // 12:00 in a 6-22 range = (6*60) / (16*60) * 100 = 37.5%
    const pos = getTimePosition('2026-03-18T12:00:00', 6, 22);
    expect(pos).toBeCloseTo(37.5, 1);
  });

  test('getTimePosition clamps to 0-100', () => {
    const pos = getTimePosition('2026-03-18T03:00:00', 6, 22);
    expect(pos).toBe(0);
    const pos2 = getTimePosition('2026-03-18T23:00:00', 6, 22);
    expect(pos2).toBe(100);
  });

  test('getEventHeight calculates correct height', () => {
    // 1 hour in 16 hours = 6.25%
    const height = getEventHeight('2026-03-18T10:00:00', '2026-03-18T11:00:00', 6, 22);
    expect(height).toBeCloseTo(6.25, 1);
  });

  test('getEventHeight minimum is 2%', () => {
    const height = getEventHeight('2026-03-18T10:00:00', '2026-03-18T10:05:00', 6, 22);
    expect(height).toBeGreaterThanOrEqual(2);
  });

  test('toDateString formats correctly', () => {
    expect(toDateString(new Date('2026-03-18'))).toBe('2026-03-18');
  });

  test('timeString formats correctly', () => {
    expect(timeString('2026-03-18T14:30:00')).toBe('14:30');
  });

  test('DAY_NAMES_SHORT has 7 entries', () => {
    expect(DAY_NAMES_SHORT).toHaveLength(7);
    expect(DAY_NAMES_SHORT[0]).toBe('ma');
  });

  test('MEAL_TYPE_LABELS has 3 entries', () => {
    expect(Object.keys(MEAL_TYPE_LABELS)).toHaveLength(3);
    expect(MEAL_TYPE_LABELS.dinner).toBe('Avondeten');
  });
});
