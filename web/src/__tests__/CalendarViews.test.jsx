import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import WeekView from '../components/calendar/WeekView';
import DayView from '../components/calendar/DayView';
import AgendaView from '../components/calendar/AgendaView';

// Use a fixed date for deterministic tests: Wednesday 2026-03-18
const FIXED_DATE = new Date('2026-03-18T12:00:00');

// --- Sample test data ---

const sampleEvents = [
  {
    id: 'evt-1',
    title: 'Tandarts',
    start_time: '2026-03-18T14:00:00',
    end_time: '2026-03-18T15:00:00',
    all_day: 0,
    location: 'Amsterdam',
    member_color: '#3B82F6',
    member_name: 'Papa',
  },
  {
    id: 'evt-2',
    title: 'Schoolfeest',
    start_time: '2026-03-19T09:00:00',
    end_time: '2026-03-19T12:00:00',
    all_day: 0,
    member_color: '#EF4444',
  },
  {
    id: 'evt-3',
    title: 'Vakantie',
    start_time: '2026-03-20T00:00:00',
    end_time: '2026-03-20T23:59:00',
    all_day: 1,
  },
];

const sampleMeals = [
  { id: 'meal-1', date: '2026-03-18', meal_type: 'dinner', title: 'Spaghetti' },
  { id: 'meal-2', date: '2026-03-19', meal_type: 'lunch', title: 'Broodjes' },
  { id: 'meal-3', date: '2026-03-20', meal_type: 'dinner', title: 'Lasagne' },
];

const sampleChores = [
  { id: 'chore-1', date: '2026-03-18', title: 'Tanden poetsen', completed: 1 },
  { id: 'chore-2', date: '2026-03-18', title: 'Kamer opruimen', completed: 0 },
  { id: 'chore-3', date: '2026-03-19', title: 'Afwassen', completed: 1 },
];

// --- WeekView ---

describe('WeekView', () => {
  test('renders 7 days', () => {
    const { container } = render(
      <WeekView
        currentDate={FIXED_DATE}
        events={[]}
        meals={[]}
        chores={[]}
        onDayClick={vi.fn()}
        onEventClick={vi.fn()}
      />
    );

    const dayElements = container.querySelectorAll('.week-day');
    expect(dayElements).toHaveLength(7);
  });

  test('renders day headers with day names', () => {
    const { container } = render(
      <WeekView
        currentDate={FIXED_DATE}
        events={[]}
        meals={[]}
        chores={[]}
        onDayClick={vi.fn()}
        onEventClick={vi.fn()}
      />
    );

    const dayNames = container.querySelectorAll('.week-day-name');
    expect(dayNames).toHaveLength(7);
    // Should start with Monday (ma)
    expect(dayNames[0].textContent).toMatch(/ma/i);
  });

  test('renders events on correct days', () => {
    render(
      <WeekView
        currentDate={FIXED_DATE}
        events={sampleEvents}
        meals={[]}
        chores={[]}
        onDayClick={vi.fn()}
        onEventClick={vi.fn()}
      />
    );

    expect(screen.getByText('Tandarts')).toBeDefined();
    expect(screen.getByText('Schoolfeest')).toBeDefined();
    expect(screen.getByText('Vakantie')).toBeDefined();
  });

  test('shows chore badges when chores data is passed', () => {
    const { container } = render(
      <WeekView
        currentDate={FIXED_DATE}
        events={[]}
        meals={[]}
        chores={sampleChores}
        onDayClick={vi.fn()}
        onEventClick={vi.fn()}
      />
    );

    const choreBadges = container.querySelectorAll('.week-chores-badge');
    expect(choreBadges.length).toBeGreaterThan(0);
    // 2026-03-18 has 1/2 done
    expect(choreBadges[0].textContent).toContain('1/2');
  });

  test('shows completed chores checkmark when all done', () => {
    const allDoneChores = [
      { id: 'c-1', date: '2026-03-18', title: 'A', completed: 1 },
      { id: 'c-2', date: '2026-03-18', title: 'B', completed: 1 },
    ];

    const { container } = render(
      <WeekView
        currentDate={FIXED_DATE}
        events={[]}
        meals={[]}
        chores={allDoneChores}
        onDayClick={vi.fn()}
        onEventClick={vi.fn()}
      />
    );

    const completeBadge = container.querySelector('.week-chores-badge.chores-complete');
    expect(completeBadge).not.toBeNull();
  });

  test('shows dinner badge when meals data is passed', () => {
    const { container } = render(
      <WeekView
        currentDate={FIXED_DATE}
        events={[]}
        meals={sampleMeals}
        chores={[]}
        onDayClick={vi.fn()}
        onEventClick={vi.fn()}
      />
    );

    const dinnerBadges = container.querySelectorAll('.week-dinner-badge');
    // Should show dinner badge for days that have dinner meals
    expect(dinnerBadges.length).toBeGreaterThan(0);
  });

  test('shows "Hele dag" for all-day events', () => {
    render(
      <WeekView
        currentDate={FIXED_DATE}
        events={sampleEvents}
        meals={[]}
        chores={[]}
        onDayClick={vi.fn()}
        onEventClick={vi.fn()}
      />
    );

    expect(screen.getByText('Hele dag')).toBeDefined();
  });

  test('shows time for timed events', () => {
    render(
      <WeekView
        currentDate={FIXED_DATE}
        events={sampleEvents}
        meals={[]}
        chores={[]}
        onDayClick={vi.fn()}
        onEventClick={vi.fn()}
      />
    );

    expect(screen.getByText('14:00')).toBeDefined();
  });

  test('calls onDayClick when day is clicked', () => {
    const onDayClick = vi.fn();
    const { container } = render(
      <WeekView
        currentDate={FIXED_DATE}
        events={[]}
        meals={[]}
        chores={[]}
        onDayClick={onDayClick}
        onEventClick={vi.fn()}
      />
    );

    const firstDay = container.querySelector('.week-day');
    firstDay.click();
    expect(onDayClick).toHaveBeenCalledTimes(1);
  });

  test('handles empty events/meals/chores gracefully', () => {
    const { container } = render(
      <WeekView
        currentDate={FIXED_DATE}
        events={[]}
        meals={[]}
        chores={[]}
        onDayClick={vi.fn()}
        onEventClick={vi.fn()}
      />
    );

    expect(container.querySelectorAll('.week-day')).toHaveLength(7);
    expect(container.querySelectorAll('.week-event')).toHaveLength(0);
    expect(container.querySelectorAll('.week-chores-badge')).toHaveLength(0);
    expect(container.querySelectorAll('.week-dinner-badge')).toHaveLength(0);
  });

  test('handles null meals and chores props', () => {
    const { container } = render(
      <WeekView
        currentDate={FIXED_DATE}
        events={[]}
        meals={null}
        chores={null}
        onDayClick={vi.fn()}
        onEventClick={vi.fn()}
      />
    );

    expect(container.querySelectorAll('.week-day')).toHaveLength(7);
  });

  test('shows +N meer when more than 4 events on a day', () => {
    const manyEvents = Array.from({ length: 6 }, (_, i) => ({
      id: `many-${i}`,
      title: `Event ${i}`,
      start_time: '2026-03-18T09:00:00',
      end_time: '2026-03-18T10:00:00',
      all_day: 0,
    }));

    render(
      <WeekView
        currentDate={FIXED_DATE}
        events={manyEvents}
        meals={[]}
        chores={[]}
        onDayClick={vi.fn()}
        onEventClick={vi.fn()}
      />
    );

    expect(screen.getByText('+2 meer')).toBeDefined();
  });
});

// --- DayView ---

describe('DayView', () => {
  const defaultSettings = {
    day_start_hour: '6',
    day_end_hour: '22',
  };

  test('renders time grid with hour labels', () => {
    const { container } = render(
      <DayView
        currentDate={FIXED_DATE}
        events={[]}
        meals={[]}
        chores={[]}
        onEventClick={vi.fn()}
        settings={defaultSettings}
      />
    );

    const timeLabels = container.querySelectorAll('.time-label');
    // 6 to 22 inclusive = 17 hours
    expect(timeLabels).toHaveLength(17);
    expect(timeLabels[0].textContent).toBe('06:00');
  });

  test('renders context bar with meals', () => {
    render(
      <DayView
        currentDate={FIXED_DATE}
        events={[]}
        meals={sampleMeals}
        chores={[]}
        onEventClick={vi.fn()}
        settings={defaultSettings}
      />
    );

    // sampleMeals has a dinner on 2026-03-18
    expect(screen.getByText('Spaghetti')).toBeDefined();
  });

  test('renders context bar with chores count', () => {
    render(
      <DayView
        currentDate={FIXED_DATE}
        events={[]}
        meals={[]}
        chores={sampleChores}
        onEventClick={vi.fn()}
        settings={defaultSettings}
      />
    );

    // 2026-03-18 has 2 chores, 1 completed
    expect(screen.getByText('1/2 klusjes')).toBeDefined();
  });

  test('renders context bar with both meals and chores', () => {
    const { container } = render(
      <DayView
        currentDate={FIXED_DATE}
        events={[]}
        meals={sampleMeals}
        chores={sampleChores}
        onEventClick={vi.fn()}
        settings={defaultSettings}
      />
    );

    const contextBar = container.querySelector('.day-context-bar');
    expect(contextBar).not.toBeNull();
    expect(screen.getByText('Spaghetti')).toBeDefined();
    expect(screen.getByText('1/2 klusjes')).toBeDefined();
  });

  test('does not render context bar when no meals/chores for the day', () => {
    const { container } = render(
      <DayView
        currentDate={FIXED_DATE}
        events={[]}
        meals={[]}
        chores={[]}
        onEventClick={vi.fn()}
        settings={defaultSettings}
      />
    );

    const contextBar = container.querySelector('.day-context-bar');
    expect(contextBar).toBeNull();
  });

  test('renders timed events in the grid', () => {
    render(
      <DayView
        currentDate={FIXED_DATE}
        events={sampleEvents}
        meals={[]}
        chores={[]}
        onEventClick={vi.fn()}
        settings={defaultSettings}
      />
    );

    expect(screen.getByText('Tandarts')).toBeDefined();
    expect(screen.getByText('14:00')).toBeDefined();
  });

  test('renders all-day events in separate bar', () => {
    const allDayEvent = [{
      id: 'ad-1',
      title: 'Hele Dag Event',
      start_time: '2026-03-18T00:00:00',
      end_time: '2026-03-18T23:59:00',
      all_day: 1,
    }];

    const { container } = render(
      <DayView
        currentDate={FIXED_DATE}
        events={allDayEvent}
        meals={[]}
        chores={[]}
        onEventClick={vi.fn()}
        settings={defaultSettings}
      />
    );

    const allDayBar = container.querySelector('.all-day-bar');
    expect(allDayBar).not.toBeNull();
    expect(screen.getByText('Hele Dag Event')).toBeDefined();
  });

  test('handles null meals and chores props', () => {
    const { container } = render(
      <DayView
        currentDate={FIXED_DATE}
        events={[]}
        meals={null}
        chores={null}
        onEventClick={vi.fn()}
        settings={defaultSettings}
      />
    );

    expect(container.querySelector('.day-view')).not.toBeNull();
  });

  test('respects custom day_start_hour and day_end_hour', () => {
    const { container } = render(
      <DayView
        currentDate={FIXED_DATE}
        events={[]}
        meals={[]}
        chores={[]}
        onEventClick={vi.fn()}
        settings={{ day_start_hour: '8', day_end_hour: '20' }}
      />
    );

    const timeLabels = container.querySelectorAll('.time-label');
    // 8 to 20 inclusive = 13 hours
    expect(timeLabels).toHaveLength(13);
    expect(timeLabels[0].textContent).toBe('08:00');
  });
});

// --- AgendaView ---

describe('AgendaView', () => {
  test('groups events by date', () => {
    const { container } = render(
      <AgendaView
        currentDate={FIXED_DATE}
        events={sampleEvents}
        meals={[]}
        chores={[]}
        onEventClick={vi.fn()}
      />
    );

    const groups = container.querySelectorAll('.agenda-group');
    // Events are on 3 different dates: 2026-03-18, 2026-03-19, 2026-03-20
    expect(groups).toHaveLength(3);
  });

  test('renders event titles', () => {
    render(
      <AgendaView
        currentDate={FIXED_DATE}
        events={sampleEvents}
        meals={[]}
        chores={[]}
        onEventClick={vi.fn()}
      />
    );

    expect(screen.getByText('Tandarts')).toBeDefined();
    expect(screen.getByText('Schoolfeest')).toBeDefined();
    expect(screen.getByText('Vakantie')).toBeDefined();
  });

  test('shows location when present', () => {
    render(
      <AgendaView
        currentDate={FIXED_DATE}
        events={sampleEvents}
        meals={[]}
        chores={[]}
        onEventClick={vi.fn()}
      />
    );

    expect(screen.getByText('Amsterdam')).toBeDefined();
  });

  test('shows member name badge when present', () => {
    render(
      <AgendaView
        currentDate={FIXED_DATE}
        events={sampleEvents}
        meals={[]}
        chores={[]}
        onEventClick={vi.fn()}
      />
    );

    expect(screen.getByText('Papa')).toBeDefined();
  });

  test('shows "Hele dag" for all-day events', () => {
    render(
      <AgendaView
        currentDate={FIXED_DATE}
        events={sampleEvents}
        meals={[]}
        chores={[]}
        onEventClick={vi.fn()}
      />
    );

    expect(screen.getByText('Hele dag')).toBeDefined();
  });

  test('shows empty state when no events', () => {
    render(
      <AgendaView
        currentDate={FIXED_DATE}
        events={[]}
        meals={[]}
        chores={[]}
        onEventClick={vi.fn()}
      />
    );

    expect(screen.getByText('Geen events in de komende 2 weken')).toBeDefined();
  });

  test('includes dates from meals even without events', () => {
    const mealsOnly = [
      { id: 'm-1', date: '2026-03-21', meal_type: 'dinner', title: 'Pizza' },
    ];

    const { container } = render(
      <AgendaView
        currentDate={FIXED_DATE}
        events={[]}
        meals={mealsOnly}
        chores={[]}
        onEventClick={vi.fn()}
      />
    );

    const groups = container.querySelectorAll('.agenda-group');
    expect(groups).toHaveLength(1);
  });

  test('includes dates from chores even without events', () => {
    const choresOnly = [
      { id: 'ch-1', date: '2026-03-22', title: 'Opruimen', completed: 0 },
    ];

    const { container } = render(
      <AgendaView
        currentDate={FIXED_DATE}
        events={[]}
        meals={[]}
        chores={choresOnly}
        onEventClick={vi.fn()}
      />
    );

    const groups = container.querySelectorAll('.agenda-group');
    expect(groups).toHaveLength(1);
  });

  test('shows chores count in date header', () => {
    render(
      <AgendaView
        currentDate={FIXED_DATE}
        events={sampleEvents}
        meals={[]}
        chores={sampleChores}
        onEventClick={vi.fn()}
      />
    );

    // 2026-03-18 has 2 chores, 1 done
    expect(screen.getByText('1/2 klusjes')).toBeDefined();
  });

  test('shows dinner title in date header', () => {
    render(
      <AgendaView
        currentDate={FIXED_DATE}
        events={sampleEvents}
        meals={sampleMeals}
        chores={[]}
        onEventClick={vi.fn()}
      />
    );

    // The dinner badge should contain the meal emoji + title
    const dinnerBadges = document.querySelectorAll('.agenda-meta-meal');
    expect(dinnerBadges.length).toBeGreaterThan(0);
  });

  test('handles null meals and chores props', () => {
    const { container } = render(
      <AgendaView
        currentDate={FIXED_DATE}
        events={sampleEvents}
        meals={null}
        chores={null}
        onEventClick={vi.fn()}
      />
    );

    const groups = container.querySelectorAll('.agenda-group');
    expect(groups.length).toBeGreaterThan(0);
  });
});
