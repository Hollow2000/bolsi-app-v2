import { Injectable, inject } from '@angular/core';

import { BudgetService } from './budget.service';
import { IncomeService } from './income.service';
import { MonthlyPaymentService } from './monthly-payment.service';
import { SettingsService } from './settings.service';

/**
 * Handles automatic month-to-month replication of recurring payments,
 * budgets, and recurring incomes. Runs once per month (tracked in
 * AppSettings.replicatedMonths / replicatedIncomeMonths) to avoid
 * duplicating data on every app start.
 */
@Injectable({ providedIn: 'root' })
export class MonthService {
  private readonly monthlyPayments = inject(MonthlyPaymentService);
  private readonly budgets = inject(BudgetService);
  private readonly incomes = inject(IncomeService);
  private readonly settings = inject(SettingsService);

  /**
   * If the current month has not been replicated yet, copies recurring
   * payments, budgets, and recurring incomes from the previous month and
   * records the month as replicated.
   */
  async autoReplicateIfNeeded(): Promise<void> {
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const key = this.monthKey(year, month);

    const record = await this.settings.get();

    // Do not replicate before the user completes onboarding. On the first
    // run there is no settings record yet; writing one here would mark
    // setupComplete as true and skip the wizard on the next reload.
    if (!record || !record.setupComplete) {
      return;
    }

    const prev = this.previousMonth(month, year);
    const replicated = record.replicatedMonths ?? [];
    const replicatedIncomes = record.replicatedIncomeMonths ?? [];

    if (replicated.includes(key) && replicatedIncomes.includes(key)) {
      return;
    }

    let paymentCount = 0;
    let budgetCount = 0;
    let incomeCount = 0;
    const updatedMonths = [...replicated];
    const updatedIncomeMonths = [...replicatedIncomes];

    if (!replicated.includes(key)) {
      paymentCount = await this.monthlyPayments.replicateRecurring(
        prev.month,
        prev.year,
        month,
        year,
      );
      budgetCount = await this.budgets.replicateBudgets(
        prev.month,
        prev.year,
        month,
        year,
      );
      updatedMonths.push(key);
    }

    // Incomes use their own tracking so months replicated before this
    // feature existed still get their recurring incomes copied once.
    if (!replicatedIncomes.includes(key)) {
      incomeCount = await this.incomes.replicateRecurring(
        prev.month,
        prev.year,
        month,
        year,
      );
      updatedIncomeMonths.push(key);
    }

    await this.settings.save({
      userName: record.userName ?? '',
      setupComplete: record.setupComplete ?? false,
      customExpenseCategories: record.customExpenseCategories,
      customIncomeCategories: record.customIncomeCategories,
      showHiddenMovements: record.showHiddenMovements,
      replicatedMonths: updatedMonths,
      replicatedIncomeMonths: updatedIncomeMonths,
    });

    if (paymentCount > 0 || budgetCount > 0 || incomeCount > 0) {
      console.info(
        `Mes ${key} preparado: ${paymentCount} pago(s), ${budgetCount} presupuesto(s) y ${incomeCount} ingreso(s) replicados.`,
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
