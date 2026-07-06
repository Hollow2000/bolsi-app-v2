import { describe, expect, it } from 'vitest';

import type { PaymentMethod } from '../models/payment-method.model';
import { validatePaymentMethod } from './payment-method.validation';

function makeCredit(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
  return {
    type: 'credit',
    name: 'BBVA',
    creditLimit: 19000,
    availableCredit: 19000,
    statementClosingDay: 13,
    creditDays: 20,
    ...overrides,
  };
}

function makeCash(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
  return {
    type: 'cash',
    name: 'Efectivo',
    currentBalance: 500,
    ...overrides,
  };
}

function makeDebit(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
  return {
    type: 'debit',
    name: 'BBVA Débito',
    currentBalance: 1500,
    ...overrides,
  };
}

describe('validatePaymentMethod', () => {
  describe('name', () => {
    it('throws when the name is empty', () => {
      expect(() => validatePaymentMethod(makeCash({ name: '   ' }))).toThrow(/nombre/);
    });

    it('throws when the name is missing', () => {
      expect(() => validatePaymentMethod({ type: 'cash', currentBalance: 0 } as PaymentMethod)).toThrow(/nombre/);
    });
  });

  describe('credit cards', () => {
    it('accepts a valid credit card', () => {
      expect(() => validatePaymentMethod(makeCredit())).not.toThrow();
    });

    it('throws when creditLimit is missing', () => {
      const card = makeCredit();
      delete card.creditLimit;
      expect(() => validatePaymentMethod(card)).toThrow(/l[ií]mite de cr[eé]dito/);
    });

    it('throws when creditLimit is zero', () => {
      expect(() => validatePaymentMethod(makeCredit({ creditLimit: 0 }))).toThrow(/l[ií]mite/);
    });

    it('throws when creditLimit is negative', () => {
      expect(() => validatePaymentMethod(makeCredit({ creditLimit: -100 }))).toThrow(/l[ií]mite/);
    });

    it('throws when creditLimit is not a finite number', () => {
      expect(() => validatePaymentMethod(makeCredit({ creditLimit: Number.NaN }))).toThrow();
    });

    it('throws when statementClosingDay is missing', () => {
      const card = makeCredit();
      delete card.statementClosingDay;
      expect(() => validatePaymentMethod(card)).toThrow(/d[ií]a de corte/);
    });

    it('throws when statementClosingDay is 0', () => {
      expect(() => validatePaymentMethod(makeCredit({ statementClosingDay: 0 }))).toThrow(/d[ií]a de corte/);
    });

    it('throws when statementClosingDay is 32', () => {
      expect(() => validatePaymentMethod(makeCredit({ statementClosingDay: 32 }))).toThrow(/d[ií]a de corte/);
    });

    it('throws when statementClosingDay is not an integer', () => {
      expect(() => validatePaymentMethod(makeCredit({ statementClosingDay: 13.5 }))).toThrow(/d[ií]a de corte/);
    });

    it('throws when creditDays is zero', () => {
      expect(() => validatePaymentMethod(makeCredit({ creditDays: 0 }))).toThrow(/d[ií]as de cr[eé]dito/);
    });

    it('throws when creditDays is negative', () => {
      expect(() => validatePaymentMethod(makeCredit({ creditDays: -5 }))).toThrow(/d[ií]as/);
    });
  });

  describe('cash and debit accounts', () => {
    it('accepts a valid cash account', () => {
      expect(() => validatePaymentMethod(makeCash())).not.toThrow();
    });

    it('accepts a valid debit account', () => {
      expect(() => validatePaymentMethod(makeDebit())).not.toThrow();
    });

    it('throws when currentBalance is missing on cash', () => {
      const cash = makeCash();
      delete cash.currentBalance;
      expect(() => validatePaymentMethod(cash)).toThrow(/saldo actual/);
    });

    it('throws when currentBalance is missing on debit', () => {
      const debit = makeDebit();
      delete debit.currentBalance;
      expect(() => validatePaymentMethod(debit)).toThrow(/saldo actual/);
    });

    it('accepts a negative currentBalance (overdraft is valid)', () => {
      expect(() => validatePaymentMethod(makeCash({ currentBalance: -250 }))).not.toThrow();
    });
  });
});
