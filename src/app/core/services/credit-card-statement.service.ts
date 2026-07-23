import { Injectable, inject } from '@angular/core';

import { database } from '../database/bolsi.database';
import type { Expense } from '../models/expense.model';
import type { InstallmentPlan } from '../models/installment-plan.model';
import type { PaymentMethod } from '../models/payment-method.model';
import type { Transfer } from '../models/transfer.model';
import { BankingCalendarService } from './banking-calendar.service';
import { PaymentMethodService } from './payment-method.service';

/**
 * Manages credit card billing cycles:
 * - Processes cutoff dates (freezes statementBalance)
 * - Calculates amount to pay, period charges, available credit
 * - Handles surplus from overpayments carrying to next period
 */
@Injectable({ providedIn: 'root' })
export class CreditCardStatementService {
  private readonly paymentMethods = inject(PaymentMethodService);
  private readonly bankingCalendar = inject(BankingCalendarService);

  /**
   * Checks if a card needs its cutoff processed.
   * Returns true if today >= closingDay and lastCutoffMonth hasn't been updated.
   */
  needsCutoff(card: PaymentMethod, today: Date): boolean {
    if (card.type !== 'credit' || card.statementClosingDay === undefined) {
      return false;
    }
    const closingDay = card.statementClosingDay;
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // If we haven't passed the closing day yet this month, no cutoff needed
    if (today.getDate() < closingDay) {
      return false;
    }

    // If already processed for this month's cutoff period, no need
    const cutoffPeriod = this.getCutoffPeriod(closingDay, today);
    return card.lastCutoffMonth !== cutoffPeriod.month || card.lastCutoffYear !== cutoffPeriod.year;
  }

  /**
   * Processes the cutoff for a credit card:
   * 1. Calculates the current period charges (direct + installments)
   * 2. Subtracts any surplus transfers from the previous period
   * 3. Freezes the statementBalance
   * 4. Updates lastCutoffMonth/Year
   */
  async processCutoff(card: PaymentMethod, today: Date): Promise<number> {
    if (card.id === undefined || card.statementClosingDay === undefined) {
      throw new Error('La tarjeta no tiene configuración válida.');
    }

    const closingDay = card.statementClosingDay;
    const period = this.getCutoffPeriod(closingDay, today);
    const previousPeriod = this.getPreviousCutoffPeriod(closingDay, today);

    // Calculate charges for the billing period that just ended (previousPeriod)
    // The date range is based on today (active period), installment filter uses previousPeriod
    const periodCharges = await this.calculatePeriodCharges(card, previousPeriod, today);

    // Find surplus transfers from the previous period
    const surplusTransfers = await this.getSurplusTransfers(
      card.id,
      previousPeriod.month,
      previousPeriod.year,
      period.month,
      period.year,
    );

    // Statement balance = period charges - surplus from previous period
    const statementBalance = Math.max(0, this.round(periodCharges - surplusTransfers));

    // Update the card — use `period` (next cutoff month) for lastCutoffMonth/Year
    // so that needsCutoff() returns false after processing
    card.statementBalance = statementBalance;
    card.lastCutoffMonth = period.month;
    card.lastCutoffYear = period.year;
    await this.paymentMethods.update(card);

    return statementBalance;
  }

  /**
   * Returns the amount to pay for a card.
   * If statementBalance is set (after cutoff), returns it minus any payments made.
   * Otherwise returns 0 (before cutoff).
   */
  getAmountToPay(card: PaymentMethod, transfers: readonly Transfer[]): number {
    if (card.type !== 'credit' || card.statementClosingDay === undefined) {
      return 0;
    }

    const today = new Date();
    const closingDay = card.statementClosingDay;

    // Before cutoff: no amount to pay yet
    if (today.getDate() < closingDay) {
      return 0;
    }

    const statementBalance = card.statementBalance ?? 0;
    if (statementBalance <= 0) {
      return 0;
    }

    // Sum credit card payments made for this billing period
    const period = this.getCutoffPeriod(closingDay, today);
    const payments = transfers
      .filter(
        (t) =>
          t.toPaymentMethodId === card.id &&
          t.isCreditCardPayment &&
          t.billingPeriodMonth === period.month &&
          t.billingPeriodYear === period.year,
      )
      .reduce((sum, t) => sum + t.amount, 0);

    return Math.max(0, this.round(statementBalance - payments));
  }

  /**
   * Calculates the charges for a specific billing period:
   * direct expenses (non-installment) in the period's date range
   * + installment plans whose cutoff matches the period.
   */
  async calculatePeriodCharges(
    card: PaymentMethod,
    period: { month: number; year: number },
    today: Date,
  ): Promise<number> {
    if (card.id === undefined || card.statementClosingDay === undefined) {
      return 0;
    }

    const closingDay = card.statementClosingDay;
    const range = this.calculatePeriodRange(period, closingDay);

    // Direct expenses in the billing period date range
    // Prioritize applicationDate (when bank confirms) over date (operation date)
    const allExpenses = await database.expenses
      .where('paymentMethodId')
      .equals(card.id)
      .toArray();
    const directSum = allExpenses
      .filter(
        (expense) =>
          !expense.isInstallment &&
          !expense.hidden &&
          (expense.applicationDate ?? expense.date) >= range.startIso &&
          (expense.applicationDate ?? expense.date) <= range.endIso,
      )
      .reduce((sum, expense) => sum + expense.amount, 0);

    // Installment plans for the cutoff month
    const allPlans = await database.installmentPlans
      .where('paymentMethodId')
      .equals(card.id)
      .toArray();
    const installmentSum = allPlans
      .filter(
        (plan) =>
          plan.cutoffYear === period.year &&
          plan.cutoffMonth === period.month &&
          !plan.paid,
      )
      .reduce((sum, plan) => sum + (plan.customAmount ?? plan.amount), 0);

    // Refunds in the billing period
    const allRefunds = await database.refunds
      .where('originalPaymentMethodId')
      .equals(card.id)
      .toArray();
    const refundSum = allRefunds
      .filter(
        (refund) =>
          refund.date >= range.startIso &&
          refund.date <= range.endIso,
      )
      .reduce((sum, refund) => sum + refund.amount, 0);

    return this.round(directSum + installmentSum - refundSum);
  }

  /**
   * Calculates available credit:
   * creditLimit - direct charges in current period - all unpaid installments + payments received
   */
  async getAvailableCredit(
    card: PaymentMethod,
    today: Date,
  ): Promise<number> {
    if (card.id === undefined || card.type !== 'credit') {
      return 0;
    }

    const creditLimit = card.creditLimit ?? 0;
    const closingDay = card.statementClosingDay ?? 1;
    const range = this.calculateActivePeriod(closingDay, today);

    // All card expenses
    const allExpenses = await database.expenses
      .where('paymentMethodId')
      .equals(card.id)
      .toArray();

    // Direct charges in current period (non-installment, non-hidden)
    // Prioritize applicationDate over date
    const directCharges = allExpenses
      .filter(
        (expense) =>
          !expense.isInstallment &&
          !expense.hidden &&
          (expense.applicationDate ?? expense.date) >= range.startIso &&
          (expense.applicationDate ?? expense.date) <= range.endIso,
      )
      .reduce((sum, expense) => sum + expense.amount, 0);

    // All unpaid installments (current + future)
    const allPlans = await database.installmentPlans
      .where('paymentMethodId')
      .equals(card.id)
      .toArray();
    const unpaidInstallments = allPlans
      .filter((plan) => !plan.paid)
      .reduce((sum, plan) => sum + (plan.customAmount ?? plan.amount), 0);

    // All transfers received (payments)
    const allTransfers = await database.transfers
      .where('toPaymentMethodId')
      .equals(card.id)
      .toArray();
    const paymentsReceived = allTransfers
      .reduce((sum, transfer) => sum + transfer.amount, 0);

    // All refunds (reduce debt)
    const allRefunds = await database.refunds
      .where('originalPaymentMethodId')
      .equals(card.id)
      .toArray();
    const refundsTotal = allRefunds
      .reduce((sum, refund) => sum + refund.amount, 0);

    return this.round(creditLimit - directCharges - unpaidInstallments + paymentsReceived + refundsTotal);
  }

  /**
   * Whether the payment button should be enabled.
   * Only after the cutoff date and if there's an amount to pay.
   */
  canPay(card: PaymentMethod, transfers: readonly Transfer[]): boolean {
    const amountToPay = this.getAmountToPay(card, transfers);
    return amountToPay > 0;
  }

  /**
   * Calculates the payment due date: closingDay + creditDays,
   * optionally skipping holidays.
   * The payment date is based on the current month's closing day,
   * not the next period.
   */
  getPaymentDueDate(card: PaymentMethod): string {
    if (card.statementClosingDay === undefined) {
      return '';
    }
    const today = new Date();
    const closingDay = card.statementClosingDay;
    const creditDays = card.creditDays ?? 0;

    // Use the current month's closing day (not the next period)
    const closingDate = new Date(today.getFullYear(), today.getMonth(), closingDay);

    // Add credit days
    const dueDate = new Date(closingDate);
    dueDate.setDate(dueDate.getDate() + creditDays);

    // Skip holidays if configured
    if (card.skipHolidays) {
      while (!this.bankingCalendar.isBusinessDay(dueDate)) {
        dueDate.setDate(dueDate.getDate() + 1);
      }
    }

    return this.toIsoDate(dueDate);
  }

  /**
   * Returns the period info for a cutoff: if today's date is at or past
   * the closing day, the period month is next month; otherwise current month.
   */
  private getCutoffPeriod(closingDay: number, today: Date): { month: number; year: number } {
    if (today.getDate() >= closingDay) {
      const nextMonth = today.getMonth() + 2; // 0-indexed to 1-indexed, then +1
      if (nextMonth > 12) {
        return { month: nextMonth - 12, year: today.getFullYear() + 1 };
      }
      return { month: nextMonth, year: today.getFullYear() };
    }
    return { month: today.getMonth() + 1, year: today.getFullYear() };
  }

  /**
   * Returns the previous cutoff period (for finding surplus transfers).
   */
  getPreviousCutoffPeriod(
    closingDay: number,
    today: Date,
  ): { month: number; year: number } {
    const current = this.getCutoffPeriod(closingDay, today);
    if (current.month === 1) {
      return { month: 12, year: current.year - 1 };
    }
    return { month: current.month - 1, year: current.year };
  }

  /**
   * Finds surplus transfers: normal transfers to the card in the current
   * period that aren't marked as credit card payments. These represent
   * overpayments from the previous period that should reduce the new
   * statement balance.
   */
  private async getSurplusTransfers(
    cardId: number,
    previousPeriodMonth: number,
    previousPeriodYear: number,
    currentPeriodMonth: number,
    currentPeriodYear: number,
  ): Promise<number> {
    const allTransfers = await database.transfers.toArray();
    // Find transfers TO the card in the current period that aren't credit card payments
    // These are surplus from the previous period
    return allTransfers
      .filter(
        (transfer) =>
          transfer.toPaymentMethodId === cardId &&
          !transfer.isCreditCardPayment &&
          transfer.month === currentPeriodMonth &&
          transfer.year === currentPeriodYear,
      )
      .reduce((sum, transfer) => sum + transfer.amount, 0);
  }

  /**
   * Calculates the date range for a specific billing period.
   * E.g., period={month:7, year:2026}, closingDay=4 → June 5 - July 4
   */
  private calculatePeriodRange(
    period: { month: number; year: number },
    closingDay: number,
  ): { startIso: string; endIso: string } {
    // The period's closing date is closingDay of the period month
    const end = new Date(period.year, period.month - 1, closingDay);
    // The period starts the day after the previous month's closing day
    const prevMonth = period.month - 2; // 0-indexed previous month
    const prevYear = prevMonth < 0 ? period.year - 1 : period.year;
    const start = new Date(prevYear, (prevMonth + 12) % 12, closingDay + 1);
    return { startIso: this.toIsoDate(start), endIso: this.toIsoDate(end) };
  }

  /**
   * Calculates the active billing period date range.
   */
  private calculateActivePeriod(
    closingDay: number,
    today: Date,
  ): { startIso: string; endIso: string } {
    const month = today.getMonth();
    const year = today.getFullYear();

    if (today.getDate() <= closingDay) {
      const prevMonthIndex = month - 1;
      const prevYear = prevMonthIndex < 0 ? year - 1 : year;
      const start = new Date(prevYear, (prevMonthIndex + 12) % 12, closingDay + 1);
      const end = new Date(year, month, closingDay);
      return { startIso: this.toIsoDate(start), endIso: this.toIsoDate(end) };
    }

    const start = new Date(year, month, closingDay + 1);
    const nextMonthIndex = month + 1;
    const nextYear = nextMonthIndex > 11 ? year + 1 : year;
    const end = new Date(nextYear, nextMonthIndex % 12, closingDay);
    return { startIso: this.toIsoDate(start), endIso: this.toIsoDate(end) };
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
