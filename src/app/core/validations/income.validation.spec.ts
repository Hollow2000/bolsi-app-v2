import { describe, expect, it } from 'vitest';

import type { Income } from '../models/income.model';
import type { PaymentMethod } from '../models/payment-method.model';
import {
  assertCanReceiveIncome,
  isValidIsoDate,
  validateIncomeFields,
} from './income.validation';

function makeIncome(overrides: Partial<Income> = {}): Income {
  return {
    date: '2026-07-05',
    description: 'Salario',
    amount: 12000,
    category: 'Salario',
    paymentMethodId: 1,
    frequency: 'monthly',
    status: 'received',
    month: 7,
    year: 2026,
    ...overrides,
  };
}

function makePaymentMethod(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
  return {
    type: 'cash',
    name: 'Efectivo',
    currentBalance: 1000,
    ...overrides,
  };
}

describe('isValidIsoDate', () => {
  it('accepts a well-formed real date', () => {
    expect(isValidIsoDate('2026-07-05')).toBe(true);
  });

  it('accepts a leap-year Feb 29', () => {
    expect(isValidIsoDate('2024-02-29')).toBe(true);
  });

  it('rejects a non-leap Feb 29', () => {
    expect(isValidIsoDate('2025-02-29')).toBe(false);
  });

  it('rejects Feb 30 (impossible calendar date)', () => {
    expect(isValidIsoDate('2026-02-30')).toBe(false);
  });

  it('rejects a malformed string', () => {
    expect(isValidIsoDate('06/07/2026')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidIsoDate('')).toBe(false);
  });
});

describe('validateIncomeFields', () => {
  it('accepts a valid income', () => {
    expect(() => validateIncomeFields(makeIncome())).not.toThrow();
  });

  it('throws when the amount is zero', () => {
    expect(() => validateIncomeFields(makeIncome({ amount: 0 }))).toThrow(/mayor a 0/);
  });

  it('throws when the amount is negative', () => {
    expect(() => validateIncomeFields(makeIncome({ amount: -100 }))).toThrow(/mayor a 0/);
  });

  it('throws when the amount is not finite', () => {
    expect(() => validateIncomeFields(makeIncome({ amount: Number.NaN }))).toThrow();
  });

  it('throws when the date is malformed', () => {
    expect(() => validateIncomeFields(makeIncome({ date: '06/07/2026' }))).toThrow(/YYYY-MM-DD/);
  });

  it('throws when the date is not a real calendar date', () => {
    expect(() => validateIncomeFields(makeIncome({ date: '2026-02-30' }))).toThrow();
  });

  it('throws when the month is out of range (0)', () => {
    expect(() => validateIncomeFields(makeIncome({ month: 0 }))).toThrow(/mes/);
  });

  it('throws when the month is out of range (13)', () => {
    expect(() => validateIncomeFields(makeIncome({ month: 13 }))).toThrow(/mes/);
  });

  it('throws when the month is not an integer', () => {
    expect(() => validateIncomeFields(makeIncome({ month: 6.5 }))).toThrow(/mes/);
  });

  it('throws when the year is below 1900', () => {
    expect(() => validateIncomeFields(makeIncome({ year: 1899 }))).toThrow(/año/);
  });

  it('throws when the description is empty', () => {
    expect(() => validateIncomeFields(makeIncome({ description: '   ' }))).toThrow(/descripci[oó]n/);
  });
});

describe('assertCanReceiveIncome — business rule: no income on credit cards', () => {
  it('throws when the payment method does not exist', () => {
    expect(() => assertCanReceiveIncome(undefined)).toThrow(/no existe/);
  });

  it('throws when the payment method is a credit card', () => {
    expect(() =>
      assertCanReceiveIncome(
        makePaymentMethod({
          type: 'credit',
          creditLimit: 19000,
          availableCredit: 19000,
          statementClosingDay: 13,
          creditDays: 20,
        }),
      ),
    ).toThrow(/cr[eé]dito/);
  });

  it('does not throw for a cash account', () => {
    expect(() => assertCanReceiveIncome(makePaymentMethod({ type: 'cash' }))).not.toThrow();
  });

  it('does not throw for a debit account', () => {
    expect(() => assertCanReceiveIncome(makePaymentMethod({ type: 'debit' }))).not.toThrow();
  });
});
