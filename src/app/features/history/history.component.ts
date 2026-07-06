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
  template: `
    <div class="app-screen">
      <header class="app-screen-header">
        <h1>Historial</h1>
        <span class="screen-period">Solo lectura</span>
      </header>
      <main class="app-screen-content">
        @if (summaries().length === 0) {
          <app-card title="Sin historial">
            <p class="empty">Aún no hay meses con actividad.</p>
          </app-card>
        } @else {
          <ul class="month-list" aria-label="Historial de meses">
            @for (entry of summaries(); track entry.year * 100 + entry.month) {
              <li class="month-card">
                <app-card [title]="monthLabel(entry.month, entry.year)">
                  <p class="month-line">
                    <span class="month-label">Ingresos recibidos</span>
                    <span class="month-value month-value--success">+{{ entry.income | mexicanCurrency }}</span>
                  </p>
                  <p class="month-line">
                    <span class="month-label">Gastos</span>
                    <span class="month-value">−{{ entry.expenses | mexicanCurrency }}</span>
                  </p>
                  <p class="month-line">
                    <span class="month-label">MSI del mes</span>
                    <span class="month-value">−{{ entry.msiCharges | mexicanCurrency }}</span>
                  </p>
                  <p class="month-line">
                    <span class="month-label">Pagos fijos (pagados/total)</span>
                    <span class="month-value">{{ entry.paymentsPaid }}/{{ entry.paymentsTotal }}</span>
                  </p>
                  <p class="month-net" [class.month-net--negative]="entry.net < 0">
                    <span class="month-label">Balance del mes</span>
                    <span class="month-value">{{ entry.net | mexicanCurrency }}</span>
                  </p>
                </app-card>
              </li>
            }
          </ul>
        }
        <a appButton variant="secondary" routerLink="/settings">
          <span class="material-symbols-outlined icon icon--small" aria-hidden="true">settings</span>
          Ir a ajustes
        </a>
      </main>
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .screen-period {
        font-size: var(--text-size-small);
        color: var(--text-secondary);
      }
      .empty {
        margin: 0;
        color: var(--text-secondary);
        text-align: center;
        padding: var(--space-2) 0;
      }
      .month-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        list-style: none;
        margin: 0 0 var(--space-3);
        padding: 0;
      }
      .month-line {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: var(--space-3);
        margin: 0 0 var(--space-1);
      }
      .month-net {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: var(--space-3);
        margin: var(--space-2) 0 0;
        padding-top: var(--space-2);
        border-top: 1px solid var(--border-default);
      }
      .month-net--negative .month-value { color: var(--color-danger); }
      .month-label {
        font-size: var(--text-size-small);
        color: var(--text-secondary);
      }
      .month-value {
        font-family: var(--font-family-mono);
        font-weight: 600;
        color: var(--text-primary);
      }
      .month-value--success { color: var(--color-success); }
    `,
  ],
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
