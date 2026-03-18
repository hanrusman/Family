import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock fetch globally
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: false,
    status: 401,
    json: () => Promise.resolve({}),
  })
);

// We test individual components rather than the full App
// since App requires full router context and API

describe('App basics', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders without crashing', async () => {
    const App = (await import('../App')).default;
    const { container } = render(<App />);
    expect(container).toBeDefined();
  });
});
