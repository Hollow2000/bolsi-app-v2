import { Injectable } from '@angular/core';

/**
 * Mexican banking calendar — recognises Saturdays, Sundays, and every
 * official banking holiday observed by Banxico. Used to compute credit
 * card due dates that always land on a business day (BR-08).
 *
 * Holiday set:
 *   1.  1 January                    — Año Nuevo
 *   2.  First Monday of February     — Día de la Constitución
 *   3.  Third Monday of March        — Natalicio de Benito Juárez
 *   4.  Holy Thursday                — variable (Easter − 3)
 *   5.  Good Friday                  — variable (Easter − 2)
 *   6.  1 May                        — Día del Trabajo
 *   7.  16 September                 — Independencia
 *   8.  Third Monday of November     — Revolución Mexicana
 *   9.  25 December                  — Navidad
 */
@Injectable({ providedIn: 'root' })
export class BankingCalendarService {
  calculateDueDate(statementDate: Date, creditDays: number): Date {
    const due = new Date(statementDate.getTime());
    due.setDate(due.getDate() + creditDays);
    return this.nextBusinessDay(due);
  }

  isBusinessDay(date: Date): boolean {
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) {
      return false;
    }
    return !this.isHoliday(date);
  }

  nextBusinessDay(date: Date): Date {
    const candidate = new Date(date.getTime());
    let safety = 0;
    while (!this.isBusinessDay(candidate)) {
      candidate.setDate(candidate.getDate() + 1);
      safety += 1;
      if (safety > 365) {
        throw new Error('nextBusinessDay safety bound exceeded');
      }
    }
    return candidate;
  }

  isHoliday(date: Date): boolean {
    const year = date.getFullYear();
    return this.getHolidaysForYear(year).some((holiday) => this.isSameDay(holiday, date));
  }

  getHolidaysForYear(year: number): Date[] {
    return [
      new Date(year, 0, 1),
      this.getNthWeekdayOfMonth(year, 1, 1, 1),
      this.getNthWeekdayOfMonth(year, 2, 3, 1),
      ...this.getHolyWeek(year),
      new Date(year, 4, 1),
      new Date(year, 8, 16),
      this.getNthWeekdayOfMonth(year, 10, 3, 1),
      new Date(year, 11, 25),
    ];
  }

  private getNthWeekdayOfMonth(year: number, month: number, occurrence: number, weekday: number): Date {
    const firstOfMonth = new Date(year, month, 1);
    const firstWeekday = firstOfMonth.getDay();
    const offset = (weekday - firstWeekday + 7) % 7;
    const day = 1 + offset + (occurrence - 1) * 7;
    return new Date(year, month, day);
  }

  private getHolyWeek(year: number): Date[] {
    const easter = this.calculateEaster(year);
    const holyThursday = new Date(easter.getTime());
    holyThursday.setDate(easter.getDate() - 3);
    const goodFriday = new Date(easter.getTime());
    goodFriday.setDate(easter.getDate() - 2);
    return [holyThursday, goodFriday];
  }

  private calculateEaster(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
}
