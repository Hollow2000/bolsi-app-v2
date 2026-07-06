import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';

import { database } from '../../core/database/bolsi.database';
import type { Expense } from '../../core/models/expense.model';
import type { MonthlyBalance } from '../../core/models/monthly-balance.model';
import type { MonthlyPayment } from '../../core/models/monthly-payment.model';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import type { Pocket } from '../../core/models/pocket.model';
import { BalanceService } from '../../core/services/balance.service';
import { IncomeService } from '../../core/services/income.service';
import { MonthlyPaymentService } from '../../core/services/monthly-payment.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { PocketService } from '../../core/services/pocket.service';
import { SettingsService } from '../../core/services/settings.service';
import { CardComponent } from '../../shared/components/card/card.component';
import { MexicanCurrencyPipe } from '../../shared/pipes/mexican-currency.pipe';
import { CreditCardStatusWidgetComponent, type CreditCardStatusEntry } from './widgets/credit-card-status-widget.component';
import { IncomeVsExpensesWidgetComponent } from './widgets/income-vs-expenses-widget.component';
import { PocketSummaryWidgetComponent, type PocketSummaryEntry } from './widgets/pocket-summary-widget.component';
import { QuickActionsWidgetComponent } from './widgets/quick-actions-widget.component';
import { UrgentPaymentsWidgetComponent } from './widgets/urgent-payments-widget.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    CardComponent,
    CreditCardStatusWidgetComponent,
    IncomeVsExpensesWidgetComponent,
    MexicanCurrencyPipe,
    PocketSummaryWidgetComponent,
    QuickActionsWidgetComponent,
    UrgentPaymentsWidgetComponent,
  ],
  template: `
    <div class="app-screen">
      <header class="app-screen-header">
        <h1>Hola, {{ userName() }} 👋</h1>
        <span class="screen-period">{{ periodLabel() }}</span>
      </header>
      <main class="app-screen-content">
        <app-card title="Balance del mes">
          @if (balance(); as data) {
            <div class="balance-hero" [class.balance-hero--danger]="data.endOfMonthProjection < 0">
              <p class="balance-hero__label">Proyección a fin de mes</p>
              <p class="balance-hero__amount">{{ data.endOfMonthProjection | mexicanCurrency }}</p>
              <p class="balance-hero__sublabel">
                @if (data.endOfMonthProjection < 0) {
                  Saldo en rojo. Te faltarían
                  <strong>{{ -data.endOfMonthProjection | mexicanCurrency }}</strong>.
                } @else {
                  Saldo positivo este mes.
                }
              </p>
            </div>
            <ul class="balance-breakdown" aria-label="Desglose del balance">
              <li>
                <span class="breakdown-label">Disponible</span>
                <span class="breakdown-value breakdown-value--primary">{{ data.totalAvailable | mexicanCurrency }}</span>
              </li>
              <li>
                <span class="breakdown-label">Deuda exigible (tarjetas)</span>
                <span class="breakdown-value breakdown-value--expense">−{{ data.billableDebtThisMonth | mexicanCurrency }}</span>
              </li>
              <li>
                <span class="breakdown-label">Pagos fijos pendientes</span>
                <span class="breakdown-value breakdown-value--expense">−{{ data.pendingFixedPayments | mexicanCurrency }}</span>
              </li>
              <li class="breakdown-row--net">
                <span class="breakdown-label">Saldo neto del mes</span>
                <span class="breakdown-value" [class.breakdown-value--danger]="data.netBalanceThisMonth < 0">
                  {{ data.netBalanceThisMonth | mexicanCurrency }}
                </span>
              </li>
              <li>
                <span class="breakdown-label">Ingreso esperado</span>
                <span class="breakdown-value breakdown-value--success">+{{ data.pendingIncome | mexicanCurrency }}</span>
              </li>
            </ul>
          } @else {
            <p class="balance-loading">Cargando balance…</p>
          }
        </app-card>

        <app-pocket-summary-widget [entries]="pocketEntries()" />

        <app-urgent-payments-widget [payments]="monthlyPayments()" />

        <app-credit-card-status-widget [items]="creditCardEntries()" />

        <app-income-vs-expenses-widget [data]="incomeVsExpenses()" />

        <app-quick-actions-widget />
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
      .balance-hero {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        padding-bottom: var(--space-4);
        border-bottom: 1px solid var(--border-default);
        margin-bottom: var(--space-3);
      }
      .balance-hero__label {
        margin: 0;
        font-size: var(--text-size-small);
        color: var(--text-secondary);
        font-weight: 500;
      }
      .balance-hero__amount {
        margin: 0;
        font-size: var(--text-size-display);
        font-weight: 700;
        font-family: var(--font-family-mono);
        color: var(--text-primary);
        line-height: 1.1;
      }
      .balance-hero--danger .balance-hero__amount { color: var(--color-danger); }
      .balance-hero__sublabel {
        margin: 0;
        font-size: var(--text-size-small);
        color: var(--text-secondary);
      }
      .balance-hero--danger .balance-hero__sublabel { color: var(--color-danger); }
      .balance-hero__sublabel strong { font-family: var(--font-family-mono); }
      .balance-breakdown {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .balance-breakdown li {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: var(--space-3);
        font-size: var(--text-size-small);
      }
      .breakdown-label { color: var(--text-secondary); }
      .breakdown-value {
        font-family: var(--font-family-mono);
        font-weight: 600;
        color: var(--text-primary);
      }
      .breakdown-value--primary { color: var(--color-primary); }
      .breakdown-value--success { color: var(--color-success); }
      .breakdown-value--danger { color: var(--color-danger); }
      .breakdown-row--net {
        padding-top: var(--space-2);
        border-top: 1px solid var(--border-default);
      }
      .breakdown-row--net .breakdown-label { color: var(--text-primary); font-weight: 600; }
      .breakdown-row--net .breakdown-value { font-size: var(--text-size-base); }
      .balance-loading {
        margin: 0;
        color: var(--text-secondary);
        text-align: center;
        padding: var(--space-4) 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly balanceService = inject(BalanceService);
  private readonly settingsService = inject(SettingsService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly pocketService = inject(PocketService);
  private readonly monthlyPaymentService = inject(MonthlyPaymentService);
  private readonly incomeService = inject(IncomeService);

  protected readonly userName = signal('');
  protected readonly balance = signal<MonthlyBalance | null>(null);
  protected readonly pockets = signal<Pocket[]>([]);
  protected readonly paymentMethods = signal<PaymentMethod[]>([]);
  protected readonly monthlyPayments = signal<MonthlyPayment[]>([]);
  protected readonly monthlyIncome = signal(0);
  protected readonly monthlyExpenses = signal(0);
  protected readonly creditCardEntries = signal<CreditCardStatusEntry[]>([]);

  protected readonly currentMonth = signal(new Date().getMonth() + 1);
  protected readonly currentYear = signal(new Date().getFullYear());

  protected readonly periodLabel = computed(() => {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    return `${monthNames[this.currentMonth() - 1]} ${this.currentYear()}`;
  });

  protected readonly pocketEntries = computed<PocketSummaryEntry[]>(() => {
    const income = this.monthlyIncome();
    const usage = this.expensesByPocket();
    return this.pockets().map((pocket) => {
      const assigned = Math.round(income * (pocket.percentage / 100) * 100) / 100;
      const used = usage.get(pocket.id ?? -1) ?? 0;
      return {
        id: pocket.id ?? 0,
        name: pocket.name,
        emoji: pocket.emoji,
        percentage: pocket.percentage,
        assigned,
        used,
      };
    });
  });

  protected readonly expensesByPocket = signal<Map<number, number>>(new Map());

  protected readonly incomeVsExpenses = computed(() => ({
    income: this.monthlyIncome(),
    expenses: this.monthlyExpenses(),
  }));

  constructor() {
    void this.loadUserName();
    effect(() => {
      const month = this.currentMonth();
      const year = this.currentYear();
      void this.loadAll(month, year);
    });
  }

  private async loadUserName(): Promise<void> {
    const record = await this.settingsService.get();
    this.userName.set(record?.userName ?? '');
  }

  private async loadAll(month: number, year: number): Promise<void> {
    try {
      const [
        balance,
        pockets,
        methods,
        payments,
        incomes,
        expenses,
        installmentPlans,
      ] = await Promise.all([
        this.balanceService.calculate(month, year),
        this.pocketService.getAll(),
        this.paymentMethodService.getAll(),
        this.monthlyPaymentService.getByMonth(month, year),
        this.incomeService.getByMonth(month, year),
        database.expenses.toArray(),
        database.installmentPlans.toArray(),
      ]);
      this.balance.set(balance);
      this.pockets.set(pockets);
      this.paymentMethods.set(methods);
      this.monthlyPayments.set(payments);
      this.monthlyIncome.set(
        incomes
          .filter((income) => income.status === 'received')
          .reduce((sum, income) => sum + income.amount, 0),
      );
      this.monthlyExpenses.set(
        this.sumMonthExpenses(expenses, month, year),
      );
      this.expensesByPocket.set(this.buildExpensesByPocket(expenses, month, year));
      this.creditCardEntries.set(
        this.buildCreditCardEntries(methods, expenses, installmentPlans, month, year),
      );
    } catch (error) {
      console.error('Dashboard load error', error);
      this.balance.set(null);
    }
  }

  private sumMonthExpenses(
    expenses: readonly Expense[],
    month: number,
    year: number,
  ): number {
    return Math.round(
      expenses
        .filter((expense) => expense.month === month && expense.year === year)
        .reduce((sum, expense) => sum + expense.amount, 0) * 100,
    ) / 100;
  }

  private buildExpensesByPocket(
    expenses: readonly Expense[],
    month: number,
    year: number,
  ): Map<number, number> {
    const map = new Map<number, number>();
    for (const expense of expenses) {
      if (expense.month !== month || expense.year !== year) continue;
      map.set(expense.pocketId, (map.get(expense.pocketId) ?? 0) + expense.amount);
    }
    for (const [key, value] of map) {
      map.set(key, Math.round(value * 100) / 100);
    }
    return map;
  }

  private buildCreditCardEntries(
    methods: readonly PaymentMethod[],
    expenses: readonly Expense[],
    installmentPlans: readonly { paymentMethodId: number; amount: number; cutoffMonth: number; cutoffYear: number }[],
    month: number,
    year: number,
  ): CreditCardStatusEntry[] {
    const today = new Date();
    return methods
      .filter((method) => method.type === 'credit' && method.id !== undefined)
      .map((card) => {
        const cardId = card.id!;
        const range = this.balanceService.calculateActivePeriod(card, today);
        const directSum = expenses
          .filter(
            (expense) =>
              expense.paymentMethodId === cardId &&
              !expense.isInstallment &&
              expense.date >= range.startIso &&
              expense.date <= range.endIso,
          )
          .reduce((sum, expense) => sum + expense.amount, 0);
        const installmentSum = installmentPlans
          .filter(
            (plan) =>
              plan.paymentMethodId === cardId &&
              plan.cutoffYear === year &&
              plan.cutoffMonth === month,
          )
          .reduce((sum, plan) => sum + plan.amount, 0);
        const daysUntilClosing = this.daysUntilClosingDay(card.statementClosingDay, today);
        return {
          id: cardId,
          name: card.name,
          availableCredit: card.availableCredit ?? 0,
          daysUntilClosing,
          periodCharges: Math.round((directSum + installmentSum) * 100) / 100,
          statementClosingDay: card.statementClosingDay ?? 1,
        };
      });
  }

  private daysUntilClosingDay(closingDay: number | undefined, today: Date): number {
    if (closingDay === undefined) return 0;
    const next = new Date(today.getFullYear(), today.getMonth(), closingDay);
    if (next.getTime() < today.getTime()) {
      next.setMonth(next.getMonth() + 1);
    }
    const diff = next.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
}
