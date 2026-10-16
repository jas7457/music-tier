import { describe, expect, it } from 'vitest';
import { getPollEndDate, getPollStatus } from './pollStatus';

const poll = { startDate: 1000, endDate: 2000 };

describe('getPollStatus', () => {
  it('is upcoming before startDate', () => {
    expect(getPollStatus(poll, 999)).toBe('upcoming');
  });

  it('is open from startDate until endDate', () => {
    expect(getPollStatus(poll, 1000)).toBe('open');
    expect(getPollStatus(poll, 1999)).toBe('open');
  });

  it('is closed at and after endDate', () => {
    expect(getPollStatus(poll, 2000)).toBe('closed');
    expect(getPollStatus(poll, 5000)).toBe('closed');
  });

  it('is closed whenever closedDate is set', () => {
    expect(getPollStatus({ ...poll, closedDate: 1500 }, 1200)).toBe('closed');
  });
});

describe('getPollEndDate', () => {
  it('uses endDate when not closed early', () => {
    expect(getPollEndDate(poll)).toBe(2000);
  });

  it('uses closedDate when closed early', () => {
    expect(getPollEndDate({ ...poll, closedDate: 1500 })).toBe(1500);
  });

  it('never goes past endDate', () => {
    expect(getPollEndDate({ ...poll, closedDate: 3000 })).toBe(2000);
  });
});
