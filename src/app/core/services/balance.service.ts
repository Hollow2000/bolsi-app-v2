import { Injectable, inject } from '@angular/core';

import { database } from '../database/bolsi.database';
import type { MonthlyBalance } from '../models/monthly-balance.model';
import type { PaymentMethod } from '../models/payment-method.model';
import { ExpenseService } from './expense.service';
import { IncomeService } from './income.service';
import { MonthlyPaymentService } from './monthly-payment.service';
import { PaymentMethodService } from './payment-method.service';
import { ScheduledSavingService } from './scheduled-saving.service';

interface DateRange {
  readonly startIso: string;
  readonly endIso: string;
}

/**
 * Computes the full balance breakdown defined by BR-04, BR-05 and
 * BR-06. The single `calculate(month, year)` entry point returns:
 *
 *   totalAvailable          — sum of `currentBalance` across cash and
 *                            debit accounts.
 *   billableDebtThisMonth   — direct credit-card expenses in the
 *                            card's active billing period plus all
 *                            installment plans whose cutoff falls in
 *                            (month, year).
 *   pendingFixedPayments    — unpaid monthly payments for the month
 *                            EXCEPT those linked to a credit card
 *                            (those are already counted in
 *                            billableDebtThisMonth).
 *   pendingIncome           — expected (not yet received) income.
 *   netBalanceThisMonth     — totalAvailable − billableDebt −
 *                            pendingFixedPayments.
 *   endOfMonthProjection    — netBalance + pendingIncome. Negative
 *                            values are flagged as danger in the UI.
 */
@Injectable({ providedIn: 'root' })
export class BalanceService {
  private readonly paymentMethods = inject(PaymentMethodService);
  private readonly expenseService = inject(ExpenseService);
  private readonly incomeService = inject(IncomeService);
  private readonly monthlyPayments = inject(MonthlyPaymentService);
  private readonly scheduledSavings = inject(ScheduledSavingService);

  async calculate(month: number, year: number): Promise<MonthlyBalance> {
    const [methods, allExpenses, incomes, payments, allTransfers] = await Promise.all([
      this.paymentMethods.getAll(),
      database.expenses.toArray(),
      this.incomeService.getByMonth(month, year),
      this.monthlyPayments.getByMonth(month, year),
      database.transfers.toArray(),
    ]);

    const totalAvailable = this.sumAvailable(methods);
    const billableDebtThisMonth = await this.sumBillableDebt(
      methods,
      allExpenses,
      allTransfers,
      month,
      year,
    );
    const pendingFixedPayments = this.sumPendingFixedPayments(methods, payments);
    const pendingScheduledSavings = await this.scheduledSavings.getTotalPendingForMonth(month, year);
    const pendingIncome = this.sumPendingIncome(incomes);
    const netBalanceThisMonth = this.round(
      totalAvailable - billableDebtThisMonth - pendingFixedPayments - pendingScheduledSavings,
    );
    const endOfMonthProjection = this.round(netBalanceThisMonth + pendingIncome);

    return {
      totalAvailable,
      billableDebtThisMonth,
      pendingFixedPayments,
      pendingScheduledSavings,
      pendingIncome,
      netBalanceThisMonth,
      endOfMonthProjection,
    };
  }

  /**
   * Calculates billable debt for all credit cards.
   *
   * For each card:
   * - If statementBalance > 0 (after cutoff): use statementBalance minus
   *   credit card payments made for this billing period.
   * - Otherwise (before cutoff): direct charges + installments - transfers.
   */
  private async sumBillableDebt(
    methods: readonly PaymentMethod[],
    allExpenses: readonly { paymentMethodId: number; amount: number; date: string; isInstallment: boolean; hidden?: boolean }[],
    allTransfers: readonly { toPaymentMethodId: number; amount: number; month: number; year: number; isCreditCardPayment?: boolean; billingPeriodMonth?: number; billingPeriodYear?: number }[],
    month: number,
    year: number,
  ): Promise<number> {
    const creditCards = methods.filter((method) => method.type === 'credit');
    const today = new Date();
    let total = 0;
    for (const card of creditCards) {
      if (card.id === undefined) continue;
      const closingDay = card.statementClosingDay ?? 1;

      if (today.getDate() >= closingDay && (card.statementBalance ?? 0) > 0) {
        // After cutoff: use statementBalance - credit card payments for this billing period
        const billingPeriod = this.getCutoffPeriod(closingDay, today);
        const creditCardPayments = allTransfers
          .filter(
            (transfer) =>
              transfer.toPaymentMethodId === card.id &&
              transfer.isCreditCardPayment &&
              transfer.billingPeriodMonth === billingPeriod.month &&
              transfer.billingPeriodYear === billingPeriod.year,
          )
          .reduce((sum, transfer) => sum + transfer.amount, 0);
        const cardDebt = Math.max(0, (card.statementBalance ?? 0) - creditCardPayments);
        total += cardDebt;
      } else {
        // Before cutoff: direct charges + installments - transfers
        const range = this.calculateActivePeriod(card, today);
        const directSum = allExpenses
          .filter(
            (expense) =>
              expense.paymentMethodId === card.id &&
              !expense.isInstallment &&
              !expense.hidden &&
              expense.date >= range.startIso &&
              expense.date <= range.endIso,
          )
          .reduce((sum, expense) => sum + expense.amount, 0);
        const installmentPlans = await database.installmentPlans
          .where('paymentMethodId').equals(card.id)
          .toArray();
        const installmentSum = installmentPlans
          .filter(
            (plan) => plan.cutoffYear === year && plan.cutoffMonth === month && !plan.paid,
          )
          .reduce((sum, plan) => sum + (plan.customAmount ?? plan.amount), 0);
        const transfersReceived = allTransfers
          .filter(
            (transfer) =>
              transfer.toPaymentMethodId === card.id &&
              transfer.month === month &&
              transfer.year === year &&
              !transfer.isCreditCardPayment,
          )
          .reduce((sum, transfer) => sum + transfer.amount, 0);
        const cardDebt = Math.max(0, directSum + installmentSum - transfersReceived);
        total += cardDebt;
      }
    }
    return this.round(total);
  }

  /**
   * BR-05: when today is on or before the closing day, the active
   * period goes from the previous month's closing day + 1 to the
   * current month's closing day; otherwise it goes from the current
   * month's closing day + 1 to next month's closing day.
   */
  calculateActivePeriod(card: PaymentMethod, today: Date): DateRange {
    const closingDay = card.statementClosingDay ?? 1;
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

  private sumAvailable(methods: readonly PaymentMethod[]): number {
    return this.round(
      methods
        .filter((method) => method.type === 'cash' || method.type === 'debit')
        .reduce((sum, method) => sum + (method.currentBalance ?? 0), 0),
    );
  }

  /**
   * Sum every unpaid monthly payment, EXCLUDING those whose payment
   * method is a credit card (those are already in billableDebtThisMonth).
   */
  private sumPendingFixedPayments(
    methods: readonly PaymentMethod[],
    payments: readonly { paid: boolean; amount: number; amountPaid: number; paymentMethodId?: number }[],
  ): number {
    const cardIds = new Set(
      methods.filter((m) => m.type === 'credit').map((m) => m.id),
    );
    return this.round(
      payments
        .filter((payment) => !payment.paid)
        .filter((payment) => !(payment.paymentMethodId !== undefined && cardIds.has(payment.paymentMethodId)))
        .reduce((sum, payment) => sum + (payment.amount - payment.amountPaid), 0),
    );
  }

  private sumPendingIncome(
    incomes: readonly { status: string; amount: number }[],
  ): number {
    return this.round(
      incomes
        .filter((income) => income.status === 'expected')
        .reduce((sum, income) => sum + income.amount, 0),
    );
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

  private getCutoffPeriod(closingDay: number, today: Date): { month: number; year: number } {
    if (today.getDate() >= closingDay) {
      const nextMonth = today.getMonth() + 2;
      if (nextMonth > 12) {
        return { month: nextMonth - 12, year: today.getFullYear() + 1 };
      }
      return { month: nextMonth, year: today.getFullYear() };
    }
    return { month: today.getMonth() + 1, year: today.getFullYear() };
  }
}
