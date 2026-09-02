import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import type { PaymentMethod } from '../models/payment-method.model';
import type { Transfer } from '../models/transfer.model';
import { CreditCardStatementService } from './credit-card-statement.service';

describe('CreditCardStatementService', () => {
  let service: CreditCardStatementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CreditCardStatementService);
  });

  describe('getActivePeriod', () => {
    const baseCard: PaymentMethod = {
      id: 1,
      name: 'Test',
      type: 'credit',
      statementClosingDay: 26,
    };

    it('returns the period covering the statement label (lastCutoff) and the month before it', () => {
      const card: PaymentMethod = {
        ...baseCard,
        lastCutoffMonth: 10,
        lastCutoffYear: 2026,
      };
      // covered = Sep 2026 (27) .. Oct 2026 (26)
      const period = service.getActivePeriod(card);
      expect(period.startIso).toBe('2026-09-27');
      expect(period.endIso).toBe('2026-10-26');
    });

    it('crosses the year boundary correctly', () => {
      const card: PaymentMethod = {
        ...baseCard,
        lastCutoffMonth: 1,
        lastCutoffYear: 2027,
      };
      // covered = Dec 2026 (27) .. Jan 2027 (26)
      const period = service.getActivePeriod(card);
      expect(period.startIso).toBe('2026-12-27');
      expect(period.endIso).toBe('2027-01-26');
    });

    it('handles a closing day near month start', () => {
      const card: PaymentMethod = {
        ...baseCard,
        statementClosingDay: 1,
        lastCutoffMonth: 5,
        lastCutoffYear: 2026,
      };
      // covered = Apr 2026 (2) .. May 2026 (1)
      const period = service.getActivePeriod(card);
      expect(period.startIso).toBe('2026-04-02');
      expect(period.endIso).toBe('2026-05-01');
    });

    it('falls back to the calendar cutoff period when no cutoff has been processed', () => {
      // No lastCutoff set → getStatementPeriod falls back to getCutoffPeriod(now).
      const card: PaymentMethod = { ...baseCard };
      const period = service.getActivePeriod(card);
      expect(period.startIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(period.endIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(period.startIso <= period.endIso).toBe(true);
    });
  });

  describe('getPaymentDueDate', () => {
    // Statement label = September 2026 (lastCutoff). Its billing period
    // covers Aug 27..Sep 26, so payment is due closingDay(26/Ago) + creditDays.
    const baseCard: PaymentMethod = {
      id: 1,
      name: 'NU',
      type: 'credit',
      statementClosingDay: 26,
      creditDays: 6,
      statementBalance: 3779.59,
      lastCutoffMonth: 9,
      lastCutoffYear: 2026,
    };

    function paymentToCard(amount: number): Transfer {
      return {
        id: 1,
        fromPaymentMethodId: 2,
        toPaymentMethodId: 1,
        amount,
        date: '2026-09-01',
        description: 'Pago de tarjeta',
        month: 9,
        year: 2026,
        isCreditCardPayment: true,
        billingPeriodMonth: 9,
        billingPeriodYear: 2026,
      };
    }

    it('is stable across calendar month changes (does not jump when the month rolls over)', () => {
      // Aug 26 + 6 days = Sep 1. This must not become Oct 1 just because
      // the calendar date changed to September.
      expect(service.getPaymentDueDate(baseCard)).toBe('2026-09-01');
    });

    it('advances to the next period when the statement is fully paid', () => {
      const transfers = [paymentToCard(3779.59)];
      // Fully paid → next period (October). Base = previousPeriod(Oct) = Sep 26 + 6 = Oct 2.
      expect(service.getPaymentDueDate(baseCard, transfers)).toBe('2026-10-02');
    });

    it('keeps the current due date on a partial payment', () => {
      const transfers = [paymentToCard(1000)];
      // Remaining 2779.59 > 0 → not fully paid → stays at Sep 1.
      expect(service.getPaymentDueDate(baseCard, transfers)).toBe('2026-09-01');
    });

    it('advances to the next period after the cutoff is processed', () => {
      // New statement label = October 2026 → base = previousPeriod(Oct) = Sep 26 + 6 = Oct 2.
      const card: PaymentMethod = { ...baseCard, lastCutoffMonth: 10, lastCutoffYear: 2026 };
      expect(service.getPaymentDueDate(card)).toBe('2026-10-02');
    });

    it('crosses the year boundary when advancing a fully paid December statement', () => {
      const card: PaymentMethod = {
        ...baseCard,
        statementClosingDay: 26,
        creditDays: 6,
        statementBalance: 500,
        lastCutoffMonth: 12,
        lastCutoffYear: 2026,
      };
      const transfers = [paymentToCard(500)];
      transfers[0].billingPeriodMonth = 12;
      transfers[0].billingPeriodYear = 2026;
      // Fully paid → next period = Jan 2027 → base = Dec 2026 → Dec 26 + 6 = Jan 1 2027.
      expect(service.getPaymentDueDate(card, transfers)).toBe('2027-01-01');
    });
  });
});
