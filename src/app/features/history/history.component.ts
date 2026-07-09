import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { database } from '../../core/database/bolsi.database';
import type { Expense } from '../../core/models/expense.model';
import type { Income } from '../../core/models/income.model';
import type { InstallmentPlan } from '../../core/models/installment-plan.model';
import type { MonthlyPayment } from '../../core/models/monthly-payment.model';
import { CardComponent } from '../../shared/components/card/card.component';
import { MexicanCurrencyPipe } from '../../shared/pipes/mexican-currency.pipe';

interface MonthSummary {
  readonly month: number;
  readonly year: number;
  readonly income: number;
  readonly expenses: number;
  readonly net: number;
  readonly paymentsTotal: number;
  readonly paymentsPaid: number;
  readonly msiCharges: number;
}

@Component({
  selector: 'app-history',
  imports: [CardComponent, MexicanCurrencyPipe, RouterLink],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryComponent {
  protected readonly summaries = signal<MonthSummary[]>([]);

  protected readonly monthKeys = computed(() =>
    this.summaries().map((entry) => `${entry.year}-${String(entry.month).padStart(2, '0')}`),
  );

  constructor() {
    void this.load();
  }

  protected monthLabel(month: number, year: number): string {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    return `${monthNames[month - 1]} ${year}`;
  }

  private async load(): Promise<void> {
    const [expenses, incomes, installmentPlans, payments] = await Promise.all([
      database.expenses.toArray() as Promise<Expense[]>,
      database.incomes.toArray() as Promise<Income[]>,
      database.installmentPlans.toArray() as Promise<InstallmentPlan[]>,
      database.monthlyPayments.toArray() as Promise<MonthlyPayment[]>,
    ]);

    const keys = new Set<string>();
    for (const expense of expenses) keys.add(`${expense.year}-${String(expense.month).padStart(2, '0')}`);
    for (const income of incomes) keys.add(`${income.year}-${String(income.month).padStart(2, '0')}`);
    for (const payment of payments) keys.add(`${payment.year}-${String(payment.month).padStart(2, '0')}`);

    const today = new Date();
    const currentKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    keys.delete(currentKey);

    const summaries: MonthSummary[] = [];
    for (const key of keys) {
      const [yearStr, monthStr] = key.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);
      const monthExpenses = expenses.filter((e) => e.year === year && e.month === month);
      const monthIncomes = incomes.filter((i) => i.year === year && i.month === month);
      const monthPayments = payments.filter((p) => p.year === year && p.month === month);
      const monthInstallments = installmentPlans.filter(
        (p) => p.cutoffYear === year && p.cutoffMonth === month,
      );
      const incomeTotal = monthIncomes
        .filter((i) => i.status === 'received')
        .reduce((sum, i) => sum + i.amount, 0);
      const expenseTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      const msiTotal = monthInstallments.reduce((sum, p) => sum + p.amount, 0);
      const paymentsPaid = monthPayments.filter((p) => p.paid).reduce((sum, p) => sum + p.amount, 0);
      summaries.push({
        month,
        year,
        income: Math.round(incomeTotal * 100) / 100,
        expenses: Math.round(expenseTotal * 100) / 100,
        net: Math.round((incomeTotal - expenseTotal - msiTotal) * 100) / 100,
        paymentsTotal: monthPayments.length,
        paymentsPaid: monthPayments.filter((p) => p.paid).length,
        msiCharges: Math.round(msiTotal * 100) / 100,
      });
    }
    summaries.sort((a, b) => (b.year - a.year) || (b.month - a.month));
    this.summaries.set(summaries);
  }
}
