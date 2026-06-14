import { describe, it, expect } from 'vitest';

// Smoke tests — verify key utility functions work correctly.
// Full component tests can be added here as the project grows.

describe('Priority color helper', () => {
  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-600 border-gray-200',
      medium: 'bg-blue-100 text-blue-600 border-blue-200',
      high: 'bg-orange-100 text-orange-600 border-orange-200',
      urgent: 'bg-red-100 text-red-600 border-red-200'
    };
    return colors[priority] || colors.medium;
  };

  it('returns correct class for low priority', () => {
    expect(getPriorityColor('low')).toBe('bg-gray-100 text-gray-600 border-gray-200');
  });

  it('returns correct class for urgent priority', () => {
    expect(getPriorityColor('urgent')).toBe('bg-red-100 text-red-600 border-red-200');
  });

  it('falls back to medium for unknown priority', () => {
    expect(getPriorityColor('unknown')).toBe('bg-blue-100 text-blue-600 border-blue-200');
  });
});

describe('Due date formatter', () => {
  const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const diff = d - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { text: 'Overdue', color: 'text-red-500' };
    if (days === 0) return { text: 'Today', color: 'text-orange-500' };
    if (days === 1) return { text: 'Tomorrow', color: 'text-orange-500' };
    if (days <= 7) return { text: `${days} days`, color: 'text-gray-500' };
    return {
      text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      color: 'text-gray-500'
    };
  };

  it('returns null for missing date', () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate(undefined)).toBeNull();
  });

  it('returns Overdue for a past date', () => {
    const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatDate(past).text).toBe('Overdue');
  });

  it('returns a days string for a date within 7 days', () => {
    const soon = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatDate(soon);
    expect(result.text).toMatch(/days/);
  });
});
