import { Injectable, inject } from '@angular/core';

import { database } from '../database/bolsi.database';
import type { MonthlyBalance } from '../models/monthly-balance.model';
import type { PaymentMethod } from '../models/payment-method.model';
import type { Transfer } from '../models/transfer.model';
import { ExpenseService } from './expense.service';
import { CreditCardStatementService } from './credit-card-statement.service';
import { IncomeService } from './income.service';
import { MonthlyPaymentService } from './monthly-payment.service';
import { PaymentMethodService } from './payment-method.service';
import { SavingsService } from './savings.service';

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
  private readonly creditCardStatement = inject(CreditCardStatementService);
  private readonly incomeService = inject(IncomeService);
  private readonly monthlyPayments = inject(MonthlyPaymentService);
  private readonly savingsService = inject(SavingsService);

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
    );
    const pendingCardDebtFromPreviousPeriods = this.sumPendingCardDebtFromPreviousPeriods(
      methods,
      allTransfers,
    );
    const pendingFixedPayments = this.sumPendingFixedPayments(methods, payments);
    const pendingScheduledSavings = await this.savingsService.getTotalPendingScheduledForMonth(month, year);
    const pendingIncome = this.sumPendingIncome(incomes);
    const netBalanceThisMonth = this.round(
      totalAvailable -
        billableDebtThisMonth -
        pendingCardDebtFromPreviousPeriods -
        pendingFixedPayments -
        pendingScheduledSavings,
    );
    const endOfMonthProjection = this.round(netBalanceThisMonth + pendingIncome);

    return {
      totalAvailable,
      billableDebtThisMonth,
      pendingCardDebtFromPreviousPeriods,
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
    allExpenses: readonly { paymentMethodId: number; amount: number; date: string; applicationDate?: string; isInstallment: boolean; hidden?: boolean }[],
    allTransfers: readonly { toPaymentMethodId: number; amount: number; month: number; year: number; isCreditCardPayment?: boolean; billingPeriodMonth?: number; billingPeriodYear?: number }[],
  ): Promise<number> {
    const creditCards = methods.filter((method) => method.type === 'credit');
    const today = new Date();
    let total = 0;
    for (const card of creditCards) {
      if (card.id === undefined) continue;

      if (this.creditCardStatement.isCutoffProcessed(card, today) && (card.statementBalance ?? 0) > 0) {
        // The current period's cutoff has been processed: use statementBalance
        // minus credit card payments for its billing period. The period is the
        // card's frozen statement period (lastCutoffMonth/Year), so the debt
        // stays visible and payments keep matching after the calendar month
        // changes.
        const billingPeriod = this.creditCardStatement.getStatementPeriod(card);
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
        // Before cutoff (or no frozen statement): compute the active period
        // from the processed cutoff so charges keep counting until the cutoff
        // is applied, and advance immediately once it is.
        const range = this.creditCardStatement.getActivePeriod(card);
        const label = this.creditCardStatement.getStatementPeriod(card);
        const directSum = allExpenses
          .filter(
            (expense) =>
              expense.paymentMethodId === card.id &&
              !expense.isInstallment &&
              !expense.hidden &&
              (expense.applicationDate ?? expense.date) >= range.startIso &&
              (expense.applicationDate ?? expense.date) <= range.endIso,
          )
          .reduce((sum, expense) => sum + expense.amount, 0);
        const installmentPlans = await database.installmentPlans
          .where('paymentMethodId').equals(card.id)
          .toArray();
        const installmentSum = installmentPlans
          .filter(
            (plan) => plan.cutoffYear === label.year && plan.cutoffMonth === label.month && !plan.paid,
          )
          .reduce((sum, plan) => sum + (plan.customAmount ?? plan.amount), 0);
        const transfersReceived = allTransfers
          .filter(
            (transfer) =>
              transfer.toPaymentMethodId === card.id &&
              transfer.month === label.month &&
              transfer.year === label.year &&
              !transfer.isCreditCardPayment,
          )
          .reduce((sum, transfer) => sum + transfer.amount, 0);
        // Refunds reduce the debt
        const refundsForCard = await database.refunds
          .where('originalPaymentMethodId')
          .equals(card.id)
          .toArray();
        const refundsSum = refundsForCard
          .filter(
            (refund) =>
              refund.date >= range.startIso &&
              refund.date <= range.endIso,
          )
          .reduce((sum, refund) => sum + refund.amount, 0);
        const cardDebt = Math.max(0, directSum + installmentSum - transfersReceived - refundsSum);
        total += cardDebt;
      }
    }
    return this.round(total);
  }

  /**
   * Sums the amount still owed on credit card statements from periods whose
   * cutoff has not been processed yet (i.e. the previous month's pending card
   * payments). Cards whose cutoff is already processed are excluded because
   * their statement is already counted inside billableDebtThisMonth.
   */
  private sumPendingCardDebtFromPreviousPeriods(
    methods: readonly PaymentMethod[],
    allTransfers: readonly Transfer[],
  ): number {
    const today = new Date();
    return this.round(
      methods
        .filter((m) => m.type === 'credit' && m.id !== undefined)
        .filter((card) => !this.creditCardStatement.isCutoffProcessed(card, today))
        .reduce(
          (sum, card) => sum + this.creditCardStatement.getAmountToPay(card, allTransfers),
          0,
        ),
    );
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

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
