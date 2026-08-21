import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import type { PaymentMethod } from '../models/payment-method.model';
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
});
