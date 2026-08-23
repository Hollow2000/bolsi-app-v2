import { describe, expect, it } from 'vitest';

import type { Income } from '../models/income.model';
import { buildReplicatedIncomes } from './income.service';

function makeIncome(overrides: Partial<Income> = {}): Income {
  return {
    id: 41,
    date: '2026-07-05',
    description: 'Salario',
    amount: 1000,
    category: 'Salario',
    paymentMethodId: 1,
    frequency: 'monthly',
    status: 'received',
    month: 7,
    year: 2026,
    ...overrides,
  };
}

describe('buildReplicatedIncomes', () => {
  it('replicates a monthly income into the target month with expected status', () => {
    const copies = buildReplicatedIncomes([makeIncome()], 7, 2026, 8, 2026);

    expect(copies).toHaveLength(1);
    expect(copies[0].month).toBe(8);
    expect(copies[0].year).toBe(2026);
    expect(copies[0].date).toBe('2026-08-05');
    expect(copies[0].status).toBe('expected');
    expect(copies[0].frequency).toBe('monthly');
  });

  it('does not replicate one-time incomes', () => {
    const copies = buildReplicatedIncomes(
      [makeIncome({ frequency: 'one-time' })],
      7,
      2026,
      8,
      2026,
    );

    expect(copies).toHaveLength(0);
  });

  it('clamps the day when the target month is shorter', () => {
    const copies = buildReplicatedIncomes(
      [makeIncome({ date: '2026-07-31' })],
      7,
      2026,
      2,
      2026,
    );

    expect(copies[0].date).toBe('2026-02-28');
    expect(copies[0].month).toBe(2);
    expect(copies[0].year).toBe(2026);
  });

  it('replicates a biweekly pair: anchor date +15 days in the target month', () => {
    const copies = buildReplicatedIncomes(
      [makeIncome({ frequency: 'biweekly', date: '2026-07-10' })],
      7,
      2026,
      8,
      2026,
    );

    expect(copies).toHaveLength(2);
    expect(copies[0].date).toBe('2026-08-10');
    expect(copies[0].status).toBe('expected');
    expect(copies[0].month).toBe(8);
    expect(copies[1].date).toBe('2026-08-25');
    expect(copies[1].month).toBe(8);
    expect(copies[1].status).toBe('expected');
  });

  it('uses the earliest record of a biweekly pair as the anchor', () => {
    const copies = buildReplicatedIncomes(
      [
        makeIncome({ frequency: 'biweekly', date: '2026-07-25' }),
        makeIncome({ frequency: 'biweekly', date: '2026-07-10' }),
      ],
      7,
      2026,
      8,
      2026,
    );

    expect(copies).toHaveLength(2);
    expect(copies[0].date).toBe('2026-08-10');
  });

  it('handles a pair whose second leg crosses into the following month', () => {
    const copies = buildReplicatedIncomes(
      [makeIncome({ frequency: 'biweekly', date: '2026-08-20', month: 8 })],
      8,
      2026,
      9,
      2026,
    );

    expect(copies).toHaveLength(2);
    expect(copies[0].date).toBe('2026-09-20');
    expect(copies[1].date).toBe('2026-10-05');
    expect(copies[1].month).toBe(10);
    expect(copies[1].year).toBe(2026);
  });

  it('returns an empty array when there is nothing to replicate', () => {
    const copies = buildReplicatedIncomes([], 7, 2026, 8, 2026);
    expect(copies).toHaveLength(0);
  });

  it('strips the source id so replicated rows can be bulk-added without primary-key conflicts', () => {
    const copies = buildReplicatedIncomes([makeIncome()], 7, 2026, 8, 2026);
    expect(copies).toHaveLength(1);
    expect(copies[0].id).toBeUndefined();
  });

  it('strips the source id from both legs of a replicated biweekly pair', () => {
    const copies = buildReplicatedIncomes(
      [makeIncome({ frequency: 'biweekly', date: '2026-07-10' })],
      7,
      2026,
      8,
      2026,
    );
    expect(copies).toHaveLength(2);
    expect(copies[0].id).toBeUndefined();
    expect(copies[1].id).toBeUndefined();
  });
});