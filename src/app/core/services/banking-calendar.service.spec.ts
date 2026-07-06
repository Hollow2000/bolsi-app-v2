import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { BankingCalendarService } from './banking-calendar.service';

describe('BankingCalendarService', () => {
  let service: BankingCalendarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BankingCalendarService);
  });

  describe('isBusinessDay', () => {
    it('returns true for a regular weekday', () => {
      expect(service.isBusinessDay(new Date(2026, 1, 4))).toBe(true);
    });

    it('returns false on a Saturday', () => {
      expect(service.isBusinessDay(new Date(2026, 1, 7))).toBe(false);
    });

    it('returns false on a Sunday', () => {
      expect(service.isBusinessDay(new Date(2026, 1, 8))).toBe(false);
    });

    it('returns false on New Year\'s Day (1 January)', () => {
      expect(service.isBusinessDay(new Date(2026, 0, 1))).toBe(false);
    });

    it('returns false on Labor Day (1 May)', () => {
      expect(service.isBusinessDay(new Date(2026, 4, 1))).toBe(false);
    });

    it('returns false on Independence Day (16 September)', () => {
      expect(service.isBusinessDay(new Date(2026, 8, 16))).toBe(false);
    });

    it('returns false on Christmas (25 December)', () => {
      expect(service.isBusinessDay(new Date(2026, 11, 25))).toBe(false);
    });

    it('returns false on Constitution Day — first Monday of February 2026 (2 Feb)', () => {
      expect(service.isBusinessDay(new Date(2026, 1, 2))).toBe(false);
    });

    it('returns false on Benito Juárez — third Monday of March 2026 (16 Mar)', () => {
      expect(service.isBusinessDay(new Date(2026, 2, 16))).toBe(false);
    });

    it('returns false on Revolution Day — third Monday of November 2026 (16 Nov)', () => {
      expect(service.isBusinessDay(new Date(2026, 10, 16))).toBe(false);
    });

    it('returns false on Holy Thursday 2026 (2 April)', () => {
      expect(service.isBusinessDay(new Date(2026, 3, 2))).toBe(false);
    });

    it('returns false on Good Friday 2026 (3 April)', () => {
      expect(service.isBusinessDay(new Date(2026, 3, 3))).toBe(false);
    });
  });

  describe('nextBusinessDay', () => {
    it('returns the same date when given a business day', () => {
      const result = service.nextBusinessDay(new Date(2026, 1, 4));
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(4);
    });

    it('advances Saturday to the following Monday', () => {
      const result = service.nextBusinessDay(new Date(2026, 1, 7));
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(9);
    });

    it('advances Sunday to the following Monday', () => {
      const result = service.nextBusinessDay(new Date(2026, 1, 8));
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(9);
    });

    it('skips New Year\'s Day to the next business day', () => {
      const result = service.nextBusinessDay(new Date(2026, 0, 1));
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(2);
    });

    it('skips Christmas to the next business day', () => {
      const result = service.nextBusinessDay(new Date(2026, 11, 25));
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(11);
      expect(result.getDate()).toBe(28);
    });

    it('crosses a month boundary when the next business day falls in the next month', () => {
      const result = service.nextBusinessDay(new Date(2026, 4, 31));
      expect(result.getMonth()).toBe(5);
      expect(result.getDate()).toBe(1);
    });

    it('crosses a year boundary (31 December 2022 Saturday → 2 January 2023)', () => {
      const result = service.nextBusinessDay(new Date(2022, 11, 31));
      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(2);
    });

    it('skips a chain of consecutive non-business days (Holy Thursday + Good Friday + weekend)', () => {
      const result = service.nextBusinessDay(new Date(2026, 3, 2));
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(3);
      expect(result.getDate()).toBe(6);
    });

    it('skips a holiday that falls on a Friday and continues to Monday', () => {
      const result = service.nextBusinessDay(new Date(2026, 4, 1));
      expect(result.getMonth()).toBe(4);
      expect(result.getDate()).toBe(4);
    });

    it('handles Good Friday (3 April 2026) by jumping to Easter Monday', () => {
      const result = service.nextBusinessDay(new Date(2026, 3, 3));
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(3);
      expect(result.getDate()).toBe(6);
    });
  });

  describe('calculateDueDate', () => {
    it('returns the calculated day when it is already a business day', () => {
      const statement = new Date(2026, 0, 14);
      const result = service.calculateDueDate(statement, 20);
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(3);
    });

    it('crosses a month boundary', () => {
      const statement = new Date(2026, 4, 25);
      const result = service.calculateDueDate(statement, 15);
      expect(result.getMonth()).toBe(5);
      expect(result.getDate()).toBe(9);
    });

    it('crosses a year boundary', () => {
      const statement = new Date(2026, 11, 22);
      const result = service.calculateDueDate(statement, 16);
      expect(result.getFullYear()).toBe(2027);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(7);
    });

    it('advances to Monday when the calculated day lands on a Saturday', () => {
      const statement = new Date(2026, 0, 18);
      const result = service.calculateDueDate(statement, 20);
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(9);
    });

    it('advances to Monday when the calculated day lands on a Sunday', () => {
      const statement = new Date(2026, 0, 5);
      const result = service.calculateDueDate(statement, 20);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(26);
    });

    it('advances past a Mexican holiday (landing on 1 May)', () => {
      const statement = new Date(2026, 3, 16);
      const result = service.calculateDueDate(statement, 15);
      expect(result.getMonth()).toBe(4);
      expect(result.getDate()).toBe(4);
    });

    it('does not mutate the input statement date', () => {
      const statement = new Date(2026, 0, 13);
      const original = statement.getTime();
      service.calculateDueDate(statement, 20);
      expect(statement.getTime()).toBe(original);
    });
  });

  describe('getHolidaysForYear', () => {
    it('returns 9 holidays for 2026 (1 Jan, Constitution, Benito, Holy Thu, Holy Fri, 1 May, 16 Sep, Revolution, 25 Dec)', () => {
      expect(service.getHolidaysForYear(2026)).toHaveLength(9);
    });

    it('returns Constitution Day on the first Monday of February 2026 (2 Feb)', () => {
      const holidays = service.getHolidaysForYear(2026);
      const constitution = holidays.find((d) => d.getMonth() === 1 && d.getDate() <= 7);
      expect(constitution?.getDate()).toBe(2);
    });

    it('returns Constitution Day on 5 February 2024 (which is a Monday)', () => {
      const holidays = service.getHolidaysForYear(2024);
      const constitution = holidays.find((d) => d.getMonth() === 1);
      expect(constitution?.getDate()).toBe(5);
    });

    it('returns Revolution Day on 18 November 2024 (third Monday)', () => {
      const holidays = service.getHolidaysForYear(2024);
      const revolution = holidays.find((d) => d.getMonth() === 10);
      expect(revolution?.getDate()).toBe(18);
    });

    it('returns Revolution Day on 17 November 2025 (third Monday)', () => {
      const holidays = service.getHolidaysForYear(2025);
      const revolution = holidays.find((d) => d.getMonth() === 10);
      expect(revolution?.getDate()).toBe(17);
    });
  });

  describe('Easter computation (Anonymous Gregorian algorithm)', () => {
    it('computes Easter 2024 on 31 March', () => {
      const holidays = service.getHolidaysForYear(2024);
      const goodFriday = holidays.find((d) => d.getMonth() === 2 && d.getDate() === 29);
      expect(goodFriday).toBeDefined();
    });

    it('computes Easter 2025 on 20 April (Good Friday = 18 April)', () => {
      const holidays = service.getHolidaysForYear(2025);
      const goodFriday = holidays.find((d) => d.getMonth() === 3 && d.getDate() === 18);
      expect(goodFriday).toBeDefined();
    });

    it('computes Easter 2026 on 5 April (Good Friday = 3 April)', () => {
      const holidays = service.getHolidaysForYear(2026);
      const goodFriday = holidays.find((d) => d.getMonth() === 3 && d.getDate() === 3);
      expect(goodFriday).toBeDefined();
    });

    it('handles a leap year (2024) without off-by-one errors', () => {
      const holidays = service.getHolidaysForYear(2024);
      const holyThursday = holidays.find((d) => d.getMonth() === 2 && d.getDate() === 28);
      expect(holyThursday).toBeDefined();
    });

    it('handles a non-leap year (2025) without off-by-one errors', () => {
      const holidays = service.getHolidaysForYear(2025);
      const holyThursday = holidays.find((d) => d.getMonth() === 2 && d.getDate() === 17);
      expect(holyThursday).toBeDefined();
    });
  });
});
