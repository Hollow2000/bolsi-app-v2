import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';

import { database } from '../../core/database/bolsi.database';
import type { Expense } from '../../core/models/expense.model';
import type { InstallmentPlan } from '../../core/models/installment-plan.model';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import type { Transfer } from '../../core/models/transfer.model';
import { CreditCardStatementService } from '../../core/services/credit-card-statement.service';
import { ExpenseService } from '../../core/services/expense.service';
import { InstallmentPlanService } from '../../core/services/installment-plan.service';
import { MonthlyPaymentService } from '../../core/services/monthly-payment.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { TransferService } from '../../core/services/transfer.service';
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
import { InstallPromptComponent } from '../../shared/components/install-prompt/install-prompt.component';

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
    InstallPromptComponent,
  ],
  templateUrl: './credit-card-detail.component.html',
  styleUrl: './credit-card-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditCardDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly creditCardStatement = inject(CreditCardStatementService);
  private readonly expenseService = inject(ExpenseService);
  private readonly installmentService = inject(InstallmentPlanService);
  private readonly monthlyPaymentService = inject(MonthlyPaymentService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly transferService = inject(TransferService);
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
  protected readonly hiddenExpenses = signal<Expense[]>([]);
  protected readonly allTransfers = signal<Transfer[]>([]);
  protected readonly transfersReceived = signal(0);
  protected readonly currentMonth = signal(new Date().getMonth() + 1);
  protected readonly currentYear = signal(new Date().getFullYear());

  protected readonly showHidden = signal(false);
  protected readonly editingInstallment = signal<InstallmentPlan | null>(null);
  protected readonly editingInstallmentAmount = signal(0);
  protected readonly replicateAmount = signal(false);
  protected readonly editingError = signal<string | null>(null);

  protected readonly needsCutoff = signal(false);
  protected readonly cutoffAmount = signal(0);

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

  protected readonly periodChargesTotal = computed(() => {
    const direct = this.periodDirectCharges().reduce((sum, charge) => sum + charge.amount, 0);
    const installments = this.periodInstallments()
      .filter((plan) => !plan.paid)
      .reduce((sum, plan) => sum + (plan.customAmount ?? plan.amount), 0);
    return Math.round((direct + installments) * 100) / 100;
  });

  protected readonly amountToPay = computed(() => {
    const card = this.card();
    if (!card) return 0;
    return this.creditCardStatement.getAmountToPay(card, this.allTransfers());
  });

  protected readonly canPay = computed(() => {
    const card = this.card();
    if (!card) return false;
    return this.creditCardStatement.canPay(card, this.allTransfers());
  });

  protected readonly availableCredit = computed(() => {
    const card = this.card();
    return card?.availableCredit ?? 0;
  });

  protected readonly periodTotal = computed(() => {
    const direct = this.periodDirectCharges().reduce((sum, charge) => sum + charge.amount, 0);
    const installments = this.periodInstallments()
      .filter((plan) => !plan.paid)
      .reduce((sum, plan) => sum + plan.amount, 0);
    const total = direct + installments - this.transfersReceived();
    return Math.max(0, Math.round(total * 100) / 100);
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

  protected paymentDueDate(): string {
    const method = this.card();
    if (!method) return '';
    return this.creditCardStatement.getPaymentDueDate(method);
  }

  protected paymentDueDateLabel(): string {
    const iso = this.paymentDueDate();
    if (!iso) return '—';
    const [, mm, dd] = iso.split('-');
    return `${dd}/${mm}`;
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
    const dueDate = this.creditCardStatement.getPaymentDueDate(method);
    this.paymentDraft.set({
      name: `Pago ${method.name}`,
      amount: this.amountToPay(),
      dueDate: dueDate || this.todayIso(),
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
    const amount = this.roundCurrency(draft.amount);
    if (amount <= 0) {
      this.paymentError.set('El monto debe ser mayor a 0.');
      return;
    }
    const maxPay = this.amountToPay();
    if (amount > maxPay) {
      this.paymentError.set(`El monto máximo a pagar es ${maxPay}.`);
      return;
    }
    this.savingPayment.set(true);
    this.paymentError.set(null);
    try {
      const today = new Date();
      const closingDay = method.statementClosingDay ?? 1;
      const billingPeriod = this.getCutoffPeriod(closingDay, today);

      await this.transferService.create({
        fromPaymentMethodId: sourceId,
        toPaymentMethodId: method.id!,
        amount,
        date: this.todayIso(),
        description: draft.name.trim() || `Pago ${method.name}`,
        month: today.getMonth() + 1,
        year: today.getFullYear(),
        isCreditCardPayment: true,
        billingPeriodMonth: billingPeriod.month,
        billingPeriodYear: billingPeriod.year,
      });
      this.toast.show('Pago registrado. Se descontó de la cuenta seleccionada.');
      this.closePay();
      await this.load();
    } catch (error) {
      this.paymentError.set(error instanceof Error ? error.message : 'No se pudo registrar el pago.');
    } finally {
      this.savingPayment.set(false);
    }
  }

  protected async closePeriod(): Promise<void> {
    const method = this.card();
    if (!method) return;
    try {
      const today = new Date();
      const statementBalance = await this.creditCardStatement.processCutoff(method, today);
      this.toast.show(`Período cerrado. Saldo al corte: ${new MexicanCurrencyPipe().transform(statementBalance)}`);
      await this.load();
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'No se pudo cerrar el período.');
    }
  }

  protected editInstallment(plan: InstallmentPlan): void {
    this.editingInstallment.set(plan);
    this.editingInstallmentAmount.set(plan.customAmount ?? plan.amount);
    this.replicateAmount.set(false);
    this.editingError.set(null);
  }

  protected closeEditInstallment(): void {
    this.editingInstallment.set(null);
    this.editingError.set(null);
  }

  protected async saveInstallmentEdit(): Promise<void> {
    const plan = this.editingInstallment();
    if (!plan || plan.id === undefined) return;
    const amount = this.roundCurrency(this.editingInstallmentAmount());
    if (amount <= 0) {
      this.editingError.set('El monto debe ser mayor a 0.');
      return;
    }
    try {
      if (this.replicateAmount()) {
        await this.installmentService.replicateAmount(plan.expenseOriginId, amount);
        this.toast.show('Monto replicado a todas las cuotas pendientes.');
      } else {
        await this.installmentService.updateAmount(plan.id, amount);
        this.toast.show('Cuota actualizada.');
      }
      this.closeEditInstallment();
      await this.load();
    } catch (error) {
      this.editingError.set(error instanceof Error ? error.message : 'No se pudo actualizar la cuota.');
    }
  }

  protected toggleHidden(): void {
    this.showHidden.set(!this.showHidden());
  }

  protected get displayExpenses(): Expense[] {
    return this.showHidden()
      ? [...this.recentExpenses(), ...this.hiddenExpenses()].sort((a, b) => b.date.localeCompare(a.date))
      : this.recentExpenses();
  }

  private async load(): Promise<void> {
    const id = this.cardId();
    if (id === 0) {
      return;
    }
    const [method, allMethods, allTransfersData] = await Promise.all([
      this.paymentMethodService.getById(id),
      this.paymentMethodService.getAll(),
      database.transfers.toArray(),
    ]);
    if (!method) {
      return;
    }
    this.card.set(method);
    this.paymentMethods.set(allMethods);
    this.allTransfers.set(allTransfersData);

    const today = new Date();
    const range = this.periodRange();
    const allCardExpenses = await database.expenses
      .where('paymentMethodId').equals(id)
      .toArray();

    // Filter hidden expenses
    const hidden = allCardExpenses.filter((expense) => expense.hidden);
    this.hiddenExpenses.set(hidden.sort((a, b) => b.date.localeCompare(a.date)));

    // Non-hidden direct charges in period
    const inRange = allCardExpenses.filter(
      (expense) => !expense.isInstallment && !expense.hidden && expense.date >= range.startIso && expense.date <= range.endIso,
    );
    this.periodDirectCharges.set(inRange);

    const month = this.currentMonth();
    const year = this.currentYear();
    this.recentExpenses.set(
      allCardExpenses
        .filter((expense) => expense.month === month && expense.year === year && !expense.hidden)
        .sort((a, b) => b.date.localeCompare(a.date)),
    );

    this.transfersReceived.set(
      await this.transferService.getReceivedByMethodAndMonth(id, month, year),
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

    // Check if cutoff is needed (don't auto-process, just show button)
    if (this.creditCardStatement.needsCutoff(method, today)) {
      this.needsCutoff.set(true);
      const closingDay = method.statementClosingDay ?? 1;
      const previousPeriod = this.creditCardStatement.getPreviousCutoffPeriod(closingDay, today);
      const charges = await this.creditCardStatement.calculatePeriodCharges(method, previousPeriod, today);
      this.cutoffAmount.set(Math.round(charges * 100) / 100);
    } else {
      this.needsCutoff.set(false);
      this.cutoffAmount.set(0);
    }
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
