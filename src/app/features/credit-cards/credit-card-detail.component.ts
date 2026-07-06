import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';

import { database } from '../../core/database/bolsi.database';
import type { Expense } from '../../core/models/expense.model';
import type { InstallmentPlan } from '../../core/models/installment-plan.model';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import { ExpenseService } from '../../core/services/expense.service';
import { InstallmentPlanService } from '../../core/services/installment-plan.service';
import { MonthlyPaymentService } from '../../core/services/monthly-payment.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { CardComponent } from '../../shared/components/card/card.component';
import { ListItemComponent } from '../../shared/components/list-item/list-item.component';
import { NumberInputComponent } from '../../shared/components/number-input/number-input.component';
import { SelectInputComponent } from '../../shared/components/select-input/select-input.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';
import { DateInputComponent } from '../../shared/components/date-input/date-input.component';
import { MexicanCurrencyPipe } from '../../shared/pipes/mexican-currency.pipe';
import { ToastService } from '../../shared/services/toast.service';

interface GroupedInstallments {
  readonly expenseOriginId: number;
  readonly description: string;
  readonly totalAmount: number;
  readonly monthlyAmount: number;
  readonly totalInstallments: number;
  paidCount: number;
  plans: InstallmentPlan[];
}

interface PeriodRange {
  readonly startIso: string;
  readonly endIso: string;
  readonly month: number;
  readonly year: number;
}

@Component({
  selector: 'app-credit-card-detail',
  imports: [
    BadgeComponent,
    BottomSheetComponent,
    ButtonDirective,
    CardComponent,
    DateInputComponent,
    ListItemComponent,
    MexicanCurrencyPipe,
    NumberInputComponent,
    RouterLink,
    SelectInputComponent,
    TextInputComponent,
  ],
  template: `
    @if (card(); as method) {
      <div class="app-screen">
        <header class="app-screen-header">
          <a routerLink="/credit-cards" class="back-link" aria-label="Volver a tarjetas">
            <span class="material-symbols-outlined icon" aria-hidden="true">chevron_left</span>
          </a>
          <h1>{{ method.name }}</h1>
        </header>
        <main class="app-screen-content">
          <app-card title="Resumen">
            <div class="card-summary">
              <p class="summary-line">
                <span class="summary-label">Crédito disponible</span>
                <span class="summary-value">{{ method.availableCredit ?? 0 | mexicanCurrency }}</span>
              </p>
              <p class="summary-line">
                <span class="summary-label">Límite</span>
                <span class="summary-value">{{ method.creditLimit ?? 0 | mexicanCurrency }}</span>
              </p>
              <p class="summary-line">
                <span class="summary-label">Día de corte</span>
                <span class="summary-value">día {{ method.statementClosingDay }}</span>
              </p>
              <p class="summary-line">
                <span class="summary-label">Próximo corte</span>
                <span class="summary-value">{{ daysUntilClosing() }} días</span>
              </p>
            </div>
          </app-card>

          <section>
            <header class="section-header">
              <h2 class="section-title">Cargos del período actual</h2>
              <app-badge tone="primary" [label]="periodRangeLabel()" />
            </header>
            <app-card>
              <p class="period-total">
                <span class="period-total__label">Total a pagar este corte</span>
                <span class="period-total__amount">{{ periodTotal() | mexicanCurrency }}</span>
              </p>
              @if (periodCharges().length === 0) {
                <p class="empty">No hay cargos directos en este período.</p>
              } @else {
                <ul class="app-list">
                  @for (charge of periodCharges(); track charge.id) {
                    <li class="app-list-item">
                      <app-list-item
                        icon="shopping_bag"
                        [title]="charge.description"
                        [subtitle]="charge.date + ' · ' + charge.category"
                        [amount]="(charge.amount | mexicanCurrency) ?? ''"
                        tone="expense"
                      />
                    </li>
                  }
                </ul>
              }
              <div class="section-actions">
                <button appButton variant="primary" type="button" (click)="openPay()">
                  <span class="material-symbols-outlined icon icon--small" aria-hidden="true">payments</span>
                  Registrar pago de tarjeta
                </button>
              </div>
            </app-card>
          </section>

          <section>
            <header class="section-header">
              <h2 class="section-title">Cuotas MSI</h2>
              <app-badge [label]="installmentCount() + ' planes activos'" />
            </header>
            @if (groupedInstallments().length === 0) {
              <app-card>
                <p class="empty">Esta tarjeta no tiene compras a meses sin intereses.</p>
              </app-card>
            } @else {
              @for (group of groupedInstallments(); track group.expenseOriginId) {
                <details class="msi-group">
                  <summary>
                    <div class="msi-summary-row">
                      <app-list-item
                        icon="payments"
                        [title]="group.description"
                        [subtitle]="(group.paidCount + '/' + group.totalInstallments) + ' pagos realizados'"
                        [amount]="(group.monthlyAmount | mexicanCurrency) ?? ''"
                      />
                      <span class="material-symbols-outlined icon msi-chevron" aria-hidden="true">expand_more</span>
                    </div>
                  </summary>
                  <ul class="app-list msi-plans">
                    @for (plan of group.plans; track plan.id) {
                      <li class="app-list-item msi-plan">
                        <app-list-item
                          [icon]="plan.paid ? 'check_circle' : 'schedule'"
                          [title]="'Cuota ' + plan.installmentNumber + ' de ' + plan.totalInstallments"
                          [subtitle]="monthLabel(plan.cutoffMonth, plan.cutoffYear)"
                          [amount]="(plan.amount | mexicanCurrency) ?? ''"
                          [tone]="plan.paid ? 'income' : 'expense'"
                        />
                      </li>
                    }
                  </ul>
                </details>
              }
            }
          </section>

          <section>
            <header class="section-header">
              <h2 class="section-title">Próximos cortes</h2>
            </header>
            @if (upcomingCharges().length === 0) {
              <app-card>
                <p class="empty">No hay cuotas en los próximos meses.</p>
              </app-card>
            } @else {
              <ul class="app-list">
                @for (entry of upcomingCharges(); track entry.plan.id) {
                  <li class="app-list-item">
                    <app-list-item
                      icon="event_upcoming"
                      [title]="entry.label"
                      [subtitle]="monthLabel(entry.plan.cutoffMonth, entry.plan.cutoffYear)"
                      [amount]="(entry.plan.amount | mexicanCurrency) ?? ''"
                    />
                  </li>
                }
              </ul>
            }
          </section>

          <section>
            <header class="section-header">
              <h2 class="section-title">Gastos recientes</h2>
            </header>
            @if (recentExpenses().length === 0) {
              <app-card>
                <p class="empty">Sin gastos registrados este mes.</p>
              </app-card>
            } @else {
              <ul class="app-list" aria-label="Gastos recientes">
                @for (expense of recentExpenses(); track expense.id) {
                  <li>
                    <app-list-item
                      icon="shopping_bag"
                      [title]="expense.description"
                      [subtitle]="expense.date + ' · ' + expense.category"
                      [amount]="(expense.amount | mexicanCurrency) ?? ''"
                      tone="expense"
                    />
                  </li>
                }
              </ul>
            }
          </section>
        </main>
      </div>

      @if (payingCard()) {
        <app-bottom-sheet title="Registrar pago de tarjeta" (close)="closePay()">
          <app-text-input
            label="Descripción"
            [value]="paymentDraft().name"
            (valueChange)="onPaymentFieldChange('name', $event)"
          />
          <app-number-input
            label="Monto a pagar"
            placeholder="0.00"
            [min]="0"
            [value]="paymentDraft().amount"
            (valueChange)="onPaymentFieldChange('amount', $event)"
          />
          <app-date-input
            label="Fecha de vencimiento"
            [value]="paymentDraft().dueDate"
            (valueChange)="onPaymentFieldChange('dueDate', $event)"
          />
          <app-select-input
            label="Pagar con"
            [valueType]="'number'"
            [value]="sourcePaymentMethodId()"
            (valueChange)="sourcePaymentMethodId.set($any($event))"
          >
            <option value="0" disabled [selected]="sourcePaymentMethodId() === 0">Selecciona una cuenta</option>
            @for (method of sourcePaymentMethods(); track method.id) {
              <option [value]="method.id" [selected]="method.id === sourcePaymentMethodId()">
                {{ method.name }} ({{ method.type === 'cash' ? 'Efectivo' : 'Débito' }})
              </option>
            }
          </app-select-input>
          @if (paymentError(); as message) {
            <p class="modal-error" role="alert">{{ message }}</p>
          }
          <div class="modal-actions">
            <button appButton variant="secondary" type="button" (click)="closePay()">
              Cancelar
            </button>
            <button appButton variant="primary" type="button" [disabled]="savingPayment()" (click)="onSavePayment()">
              {{ savingPayment() ? 'Guardando…' : 'Registrar pago' }}
            </button>
          </div>
        </app-bottom-sheet>
      }
    } @else {
      <div class="app-screen">
        <header class="app-screen-header">
          <a routerLink="/credit-cards" class="back-link" aria-label="Volver a tarjetas">
            <span class="material-symbols-outlined icon" aria-hidden="true">chevron_left</span>
          </a>
          <h1>Tarjeta</h1>
        </header>
        <main class="app-screen-content">
          <app-card title="Sin datos">
            <p class="empty">No se encontró la tarjeta solicitada.</p>
          </app-card>
        </main>
      </div>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .back-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        margin-left: calc(-1 * var(--space-2));
        color: var(--text-primary);
        text-decoration: none;
      }
      .card-summary {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .summary-line {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin: 0;
        gap: var(--space-3);
      }
      .summary-label {
        font-size: var(--text-size-small);
        color: var(--text-secondary);
      }
      .summary-value {
        font-size: var(--text-size-base);
        font-weight: 600;
        font-family: var(--font-family-mono);
        color: var(--text-primary);
      }
      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
        margin-bottom: var(--space-2);
      }
      .section-title {
        font-size: var(--text-size-medium);
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
      }
      .period-total {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin: 0 0 var(--space-3);
        padding-bottom: var(--space-3);
        border-bottom: 1px solid var(--border-default);
      }
      .period-total__label {
        font-size: var(--text-size-small);
        color: var(--text-secondary);
      }
      .period-total__amount {
        font-size: var(--text-size-extra-large);
        font-weight: 700;
        font-family: var(--font-family-mono);
        color: var(--color-primary);
      }
      .empty {
        margin: 0;
        color: var(--text-secondary);
        text-align: center;
        padding: var(--space-2) 0;
      }
      .section-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: var(--space-3);
      }
      .msi-group {
        background: var(--surface);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-large);
        overflow: hidden;
        margin-bottom: var(--space-3);
      }
      .msi-group summary {
        cursor: pointer;
        list-style: none;
        padding: var(--space-3) var(--space-4);
      }
      .msi-group summary::-webkit-details-marker { display: none; }
      .msi-summary-row {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: var(--space-2);
      }
      .msi-chevron {
        color: var(--text-secondary);
        transition: transform 0.15s ease;
      }
      details[open] .msi-chevron {
        transform: rotate(180deg);
      }
      .msi-plans {
        border-top: 1px solid var(--border-default);
        border-radius: 0;
      }
      .msi-plan app-list-item { padding: var(--space-2) var(--space-4); }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-2);
        margin-top: var(--space-2);
      }
      .modal-error {
        font-size: var(--text-size-extra-small);
        color: var(--color-danger);
        margin: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditCardDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly expenseService = inject(ExpenseService);
  private readonly installmentService = inject(InstallmentPlanService);
  private readonly monthlyPaymentService = inject(MonthlyPaymentService);
  private readonly toast = inject(ToastService);

  private readonly cardId = toSignal(
    this.route.paramMap.pipe(map((params) => Number(params.get('id')) ?? 0)),
    { initialValue: 0 },
  );

  protected readonly card = signal<PaymentMethod | null>(null);
  protected readonly paymentMethods = signal<PaymentMethod[]>([]);
  protected readonly periodDirectCharges = signal<Expense[]>([]);
  protected readonly periodInstallments = signal<InstallmentPlan[]>([]);
  protected readonly upcomingInstallments = signal<InstallmentPlan[]>([]);
  protected readonly expensesById = signal<Map<number, Expense>>(new Map());
  protected readonly recentExpenses = signal<Expense[]>([]);
  protected readonly currentMonth = signal(new Date().getMonth() + 1);
  protected readonly currentYear = signal(new Date().getFullYear());

  protected readonly payingCard = signal(false);
  protected readonly savingPayment = signal(false);
  protected readonly paymentError = signal<string | null>(null);
  protected readonly sourcePaymentMethodId = signal<number>(0);
  protected readonly paymentDraft = signal({
    name: '',
    amount: 0,
    dueDate: this.todayIso(),
  });

  protected readonly sourcePaymentMethods = computed(() =>
    this.paymentMethods().filter((method) => method.type !== 'credit'),
  );

  protected readonly periodRange = computed<PeriodRange>(() => this.calculatePeriodRange());

  protected readonly periodRangeLabel = computed(() => {
    const range = this.periodRange();
    const start = this.formatIsoDate(range.startIso);
    const end = this.formatIsoDate(range.endIso);
    return `${start} → ${end}`;
  });

  protected readonly periodCharges = computed(() => this.periodDirectCharges());

  protected readonly periodTotal = computed(() => {
    const direct = this.periodDirectCharges().reduce((sum, charge) => sum + charge.amount, 0);
    const installments = this.periodInstallments().reduce((sum, plan) => sum + plan.amount, 0);
    return Math.round((direct + installments) * 100) / 100;
  });

  protected readonly groupedInstallments = computed<GroupedInstallments[]>(() => {
    const expenses = this.expensesById();
    const map = new Map<number, GroupedInstallments>();
    const allPlans = [
      ...this.periodInstallments(),
      ...this.upcomingInstallments(),
    ];
    for (const plan of allPlans) {
      const expense = expenses.get(plan.expenseOriginId);
      if (!expense) continue;
      const existing = map.get(plan.expenseOriginId);
      if (existing) {
        existing.plans.push(plan);
      } else {
        map.set(plan.expenseOriginId, {
          expenseOriginId: plan.expenseOriginId,
          description: expense.description,
          totalAmount: expense.amount,
          monthlyAmount: plan.amount,
          totalInstallments: plan.totalInstallments,
          paidCount: 0,
          plans: [plan],
        });
      }
    }
    for (const group of map.values()) {
      group.paidCount = group.plans.filter((p) => p.paid).length;
      group.plans.sort((a, b) => {
        if (a.cutoffYear !== b.cutoffYear) return a.cutoffYear - b.cutoffYear;
        if (a.cutoffMonth !== b.cutoffMonth) return a.cutoffMonth - b.cutoffMonth;
        return a.installmentNumber - b.installmentNumber;
      });
    }
    return Array.from(map.values()).sort((a, b) => a.plans[0].cutoffYear - b.plans[0].cutoffYear || a.plans[0].cutoffMonth - b.plans[0].cutoffMonth);
  });

  protected readonly upcomingCharges = computed(() => {
    return this.upcomingInstallments().map((plan) => {
      const expense = this.expensesById().get(plan.expenseOriginId);
      const label = expense ? expense.description : `Plan #${plan.expenseOriginId}`;
      return { plan, label };
    });
  });

  protected readonly installmentCount = computed(() => {
    const seen = new Set<number>();
    for (const plan of this.periodInstallments()) seen.add(plan.expenseOriginId);
    for (const plan of this.upcomingInstallments()) seen.add(plan.expenseOriginId);
    return seen.size;
  });

  constructor() {
    void this.load();
  }

  protected daysUntilClosing(): number {
    const method = this.card();
    if (!method || method.statementClosingDay === undefined) {
      return 0;
    }
    const today = new Date();
    const closingDay = method.statementClosingDay;
    const next = new Date(today.getFullYear(), today.getMonth(), closingDay);
    if (next.getTime() < today.getTime()) {
      next.setMonth(next.getMonth() + 1);
    }
    const diffMs = next.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  protected monthLabel(month: number, year: number): string {
    const monthNames = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
    ];
    return `${monthNames[month - 1]} ${year}`;
  }

  protected openPay(): void {
    const method = this.card();
    if (!method) {
      return;
    }
    const range = this.periodRange();
    this.paymentDraft.set({
      name: `Pago ${method.name}`,
      amount: this.periodTotal(),
      dueDate: this.addDaysToIso(range.endIso, 20),
    });
    this.sourcePaymentMethodId.set(this.sourcePaymentMethods()[0]?.id ?? 0);
    this.paymentError.set(null);
    this.payingCard.set(true);
  }

  protected closePay(): void {
    this.payingCard.set(false);
    this.paymentError.set(null);
  }

  protected onPaymentFieldChange<K extends keyof ReturnType<typeof this.paymentDraft>>(
    field: K,
    value: ReturnType<typeof this.paymentDraft>[K],
  ): void {
    this.paymentDraft.update((draft) => ({ ...draft, [field]: value }));
  }

  protected async onSavePayment(): Promise<void> {
    const method = this.card();
    if (!method) {
      return;
    }
    const draft = this.paymentDraft();
    const sourceId = this.sourcePaymentMethodId();
    if (sourceId === 0) {
      this.paymentError.set('Selecciona una cuenta para pagar.');
      return;
    }
    this.savingPayment.set(true);
    this.paymentError.set(null);
    try {
      const parts = draft.dueDate.split('-').map((segment) => Number(segment));
      if (parts.length !== 3 || parts.some((segment) => !Number.isInteger(segment))) {
        throw new Error('Fecha de vencimiento inválida.');
      }
      const [year, month] = parts;
      const paymentId = await this.monthlyPaymentService.create({
        name: draft.name.trim() || `Pago ${method.name}`,
        amount: this.roundCurrency(draft.amount),
        paid: false,
        amountPaid: 0,
        dueDate: draft.dueDate,
        paymentMethodId: method.id,
        expenseCategory: 'Other',
        pocketId: undefined,
        priority: 0,
        isRecurring: true,
        month,
        year,
      });
      const saved = await this.monthlyPaymentService.getById(paymentId);
      if (saved) {
        await this.monthlyPaymentService.markAsPaid(saved, draft.amount, sourceId);
      }
      this.toast.show('Pago registrado. Se descontó de la cuenta seleccionada.');
      this.closePay();
      await this.load();
    } catch (error) {
      this.paymentError.set(error instanceof Error ? error.message : 'No se pudo registrar el pago.');
    } finally {
      this.savingPayment.set(false);
    }
  }

  private async load(): Promise<void> {
    const id = this.cardId();
    if (id === 0) {
      return;
    }
    const [method, allMethods] = await Promise.all([
      this.paymentMethodService.getById(id),
      this.paymentMethodService.getAll(),
    ]);
    if (!method) {
      return;
    }
    this.card.set(method);
    this.paymentMethods.set(allMethods);

    const range = this.periodRange();
    const allCardExpenses = await database.expenses
      .where('paymentMethodId').equals(id)
      .toArray();
    const inRange = allCardExpenses.filter(
      (expense) => !expense.isInstallment && expense.date >= range.startIso && expense.date <= range.endIso,
    );
    this.periodDirectCharges.set(inRange);

    const month = this.currentMonth();
    const year = this.currentYear();
    this.recentExpenses.set(
      allCardExpenses
        .filter((expense) => expense.month === month && expense.year === year)
        .sort((a, b) => b.date.localeCompare(a.date)),
    );

    const installmentPlans = await database.installmentPlans
      .where('paymentMethodId').equals(id)
      .toArray();
    const periodPlans = installmentPlans
      .filter((plan) => plan.cutoffYear === range.year && plan.cutoffMonth === range.month)
      .sort((a, b) => a.installmentNumber - b.installmentNumber);
    this.periodInstallments.set(periodPlans);

    const nextRange = this.calculateNextRange();
    const upcoming = installmentPlans
      .filter((plan) => !plan.paid && (plan.cutoffYear > nextRange.year || (plan.cutoffYear === nextRange.year && plan.cutoffMonth >= nextRange.month)))
      .sort((a, b) => a.cutoffYear - b.cutoffYear || a.cutoffMonth - b.cutoffMonth);
    this.upcomingInstallments.set(upcoming);

    const originIds = new Set<number>();
    for (const plan of [...periodPlans, ...upcoming]) {
      originIds.add(plan.expenseOriginId);
    }
    if (originIds.size > 0) {
      const origins = await database.expenses.bulkGet(Array.from(originIds));
      const map = new Map<number, Expense>();
      for (const origin of origins) {
        if (origin) {
          map.set(origin.id!, origin);
        }
      }
      this.expensesById.set(map);
    }
  }

  private calculatePeriodRange(): PeriodRange {
    const method = this.card();
    if (!method || method.statementClosingDay === undefined) {
      return { startIso: '', endIso: '', month: this.currentMonth(), year: this.currentYear() };
    }
    const today = new Date();
    const closingDay = method.statementClosingDay;
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    if (today.getDate() <= closingDay) {
      // Period started previous month (closingDay+1) and ends this month (closingDay).
      const prev = new Date(year, month - 2, closingDay + 1);
      const end = new Date(year, month - 1, closingDay);
      return {
        startIso: this.toIsoDate(prev),
        endIso: this.toIsoDate(end),
        month,
        year,
      };
    }
    // Period started this month (closingDay+1) and ends next month (closingDay).
    const start = new Date(year, month - 1, closingDay + 1);
    const next = new Date(year, month, closingDay);
    return {
      startIso: this.toIsoDate(start),
      endIso: this.toIsoDate(next),
      month: month === 12 ? 1 : month + 1,
      year: month === 12 ? year + 1 : year,
    };
  }

  private calculateNextRange(): { month: number; year: number } {
    const period = this.periodRange();
    if (period.month === 12) {
      return { month: 1, year: period.year + 1 };
    }
    return { month: period.month + 1, year: period.year };
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatIsoDate(iso: string): string {
    if (!iso) return '';
    const [, mm, dd] = iso.split('-');
    return `${dd}/${mm}`;
  }

  private addDaysToIso(iso: string, days: number): string {
    if (!iso) return this.todayIso();
    const date = new Date(`${iso}T00:00:00`);
    date.setDate(date.getDate() + days);
    return this.toIsoDate(date);
  }

  private todayIso(): string {
    return this.toIsoDate(new Date());
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
