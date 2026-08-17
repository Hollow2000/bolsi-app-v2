import { Injectable, inject } from '@angular/core';

import { BudgetService } from './budget.service';
import { MonthlyPaymentService } from './monthly-payment.service';
import { SettingsService } from './settings.service';

/**
 * Handles automatic month-to-month replication of recurring payments
 * and budgets. Runs once per month (tracked in AppSettings.replicatedMonths)
 * to avoid duplicating data on every app start.
 */
@Injectable({ providedIn: 'root' })
export class MonthService {
  private readonly monthlyPayments = inject(MonthlyPaymentService);
  private readonly budgets = inject(BudgetService);
  private readonly settings = inject(SettingsService);

  /**
   * If the current month has not been replicated yet, copies recurring
   * payments and budgets from the previous month and records the month
   * as replicated.
   */
  async autoReplicateIfNeeded(): Promise<void> {
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const key = this.monthKey(year, month);

    const record = await this.settings.get();
    const replicated = record?.replicatedMonths ?? [];
    if (replicated.includes(key)) {
      return;
    }

    const prev = this.previousMonth(month, year);
    const paymentCount = await this.monthlyPayments.replicateRecurring(
      prev.month,
      prev.year,
      month,
      year,
    );
    const budgetCount = await this.budgets.replicateBudgets(
      prev.month,
      prev.year,
      month,
      year,
    );

    const updatedMonths = [...replicated, key];
    await this.settings.save({
      userName: record?.userName ?? '',
      setupComplete: record?.setupComplete ?? true,
      customExpenseCategories: record?.customExpenseCategories,
      customIncomeCategories: record?.customIncomeCategories,
      showHiddenMovements: record?.showHiddenMovements,
      replicatedMonths: updatedMonths,
    });

    if (paymentCount > 0 || budgetCount > 0) {
      console.info(
        `Mes ${key} preparado: ${paymentCount} pago(s) y ${budgetCount} presupuesto(s) replicados.`,
      );
    }
  }

  private previousMonth(month: number, year: number): { month: number; year: number } {
    if (month === 1) {
      return { month: 12, year: year - 1 };
    }
    return { month: month - 1, year };
  }

  private monthKey(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`;
  }
}
