import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import IdleScreen from '../components/common/IdleScreen';

describe('IdleScreen', () => {
  test('renders clock and date', () => {
    render(<IdleScreen onWake={vi.fn()} />);
    // Should show "Tik om te activeren"
    expect(screen.getByText('Tik om te activeren')).toBeDefined();
  });

  test('calls onWake when clicked', () => {
    const onWake = vi.fn();
    render(<IdleScreen onWake={onWake} />);
    fireEvent.click(screen.getByText('Tik om te activeren'));
    expect(onWake).toHaveBeenCalled();
  });
});
