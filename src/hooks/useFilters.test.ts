import { computeDateRange } from './useFilters';

describe('useFilters utils', () => {
  it('computes last 7 day range', () => {
    const range = computeDateRange({
      period: 'last_7_days',
      assistant: [],
      client: [],
      contract: [],
      status: []
    });

    expect(range.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns custom range when provided', () => {
    const range = computeDateRange({
      period: 'custom',
      from: '2026-02-01',
      to: '2026-02-11',
      assistant: [],
      client: [],
      contract: [],
      status: []
    });

    expect(range).toEqual({ from: '2026-02-01', to: '2026-02-11' });
  });
});
