import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import IdleScreen from '../components/common/IdleScreen';

// Mock the AppContext
vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    isTabletMode: false,
  }),
}));

// Mock the api module to prevent real fetch calls
vi.mock('../utils/api', () => ({
  api: {
    get: vi.fn(() => Promise.resolve([])),
  },
  tabletApi: {
    get: vi.fn(() => Promise.resolve([])),
  },
  getToken: vi.fn(() => null),
  setToken: vi.fn(),
  clearToken: vi.fn(),
}));

describe('IdleScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders clock and date', () => {
    render(<IdleScreen onWake={vi.fn()} />);
    // Should show "Tik om te activeren"
    expect(screen.getByText('Tik om te activeren')).toBeDefined();
  });

  test('renders the current time', () => {
    render(<IdleScreen onWake={vi.fn()} />);
    // The idle-time element should exist with a time format (HH:mm)
    const timeEl = document.querySelector('.idle-time');
    expect(timeEl).toBeDefined();
    expect(timeEl.textContent).toMatch(/\d{2}:\d{2}/);
  });

  test('renders the current date', () => {
    render(<IdleScreen onWake={vi.fn()} />);
    const dateEl = document.querySelector('.idle-date');
    expect(dateEl).toBeDefined();
    // Should contain some text (day name + date)
    expect(dateEl.textContent.length).toBeGreaterThan(0);
  });

  test('calls onWake when clicked', () => {
    const onWake = vi.fn();
    render(<IdleScreen onWake={onWake} />);
    fireEvent.click(screen.getByText('Tik om te activeren'));
    expect(onWake).toHaveBeenCalled();
  });

  test('fetches events and meals on mount', async () => {
    const { api } = await import('../utils/api');

    render(<IdleScreen onWake={vi.fn()} />);

    // The component fetches events and meals on mount
    // Wait for the async effect to run
    await vi.waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });

    // Should have called for events and meals
    const calls = api.get.mock.calls.map((c) => c[0]);
    expect(calls.some((url) => url.includes('/events'))).toBe(true);
    expect(calls.some((url) => url.includes('/meals'))).toBe(true);
  });
});
