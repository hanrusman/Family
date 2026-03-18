import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  isToday,
  isSameDay,
  isSameMonth,
  parseISO,
  differenceInMinutes,
  eachDayOfInterval,
  getHours,
  getMinutes,
} from 'date-fns';
import { nl } from 'date-fns/locale';

export function formatNL(date, formatStr) {
  return format(typeof date === 'string' ? parseISO(date) : date, formatStr, { locale: nl });
}

export function getWeekDays(date) {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  return eachDayOfInterval({ start, end: addDays(start, 6) });
}

export function getMonthDays(date) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: calStart, end: calEnd });
}

export function getTimePosition(timeStr, dayStartHour = 6, dayEndHour = 22) {
  const date = typeof timeStr === 'string' ? parseISO(timeStr) : timeStr;
  const hours = getHours(date);
  const minutes = getMinutes(date);
  const totalMinutes = (hours - dayStartHour) * 60 + minutes;
  const totalRange = (dayEndHour - dayStartHour) * 60;
  return Math.max(0, Math.min(100, (totalMinutes / totalRange) * 100));
}

export function getEventHeight(startStr, endStr, dayStartHour = 6, dayEndHour = 22) {
  const start = typeof startStr === 'string' ? parseISO(startStr) : startStr;
  const end = typeof endStr === 'string' ? parseISO(endStr) : endStr;
  const mins = differenceInMinutes(end, start);
  const totalRange = (dayEndHour - dayStartHour) * 60;
  return Math.max(2, (mins / totalRange) * 100);
}

export function toDateString(date) {
  return format(typeof date === 'string' ? parseISO(date) : date, 'yyyy-MM-dd');
}

export function timeString(date) {
  return format(typeof date === 'string' ? parseISO(date) : date, 'HH:mm');
}

export const DAY_NAMES_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
export const MONTH_NAMES = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december'
];

export const MEAL_TYPE_LABELS = {
  breakfast: 'Ontbijt',
  lunch: 'Lunch',
  dinner: 'Avondeten',
};

export const TIME_OF_DAY_LABELS = {
  'before_school': 'Voor school',
  'after_school': 'Na school',
  'before_bed': 'Voor bedtijd',
  'anytime': 'Overdag',
};

export {
  addDays, addWeeks, addMonths,
  subDays, subWeeks, subMonths,
  isToday, isSameDay, isSameMonth,
  parseISO, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, format,
};
