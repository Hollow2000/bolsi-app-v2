import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';

import { database } from '../../core/database/bolsi.database';
import type { Expense } from '../../core/models/expense.model';
import type { MonthlyBalance } from '../../core/models/monthly-balance.model';
import type { MonthlyPayment } from '../../core/models/monthly-payment.model';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import type { Pocket } from '../../core/models/pocket.model';
import type { Transfer } from '../../core/models/transfer.model';
import { BalanceService } from '../../core/services/balance.service';
import { CreditCardStatementService } from '../../core/services/credit-card-statement.service';
import { IncomeService } from '../../core/services/income.service';
import { MonthlyPaymentService } from '../../core/services/monthly-payment.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { PocketService } from '../../core/services/pocket.service';
import { SettingsService } from '../../core/services/settings.service';
import { TransferService } from '../../core/services/transfer.service';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { CardComponent } from '../../shared/components/card/card.component';
import { ToastService } from '../../shared/services/toast.service';
import { MexicanCurrencyPipe } from '../../shared/pipes/mexican-currency.pipe';
import { CreditCardStatusWidgetComponent, type CreditCardStatusEntry } from './widgets/credit-card-status-widget.component';
import { IncomeVsExpensesWidgetComponent } from './widgets/income-vs-expenses-widget.component';
import { PocketSummaryWidgetComponent, type PocketSummaryEntry } from './widgets/pocket-summary-widget.component';
import { QuickActionsWidgetComponent } from './widgets/quick-actions-widget.component';
import { UrgentPaymentsWidgetComponent } from './widgets/urgent-payments-widget.component';
import { TransferFormModalComponent } from '../transfers/transfer-form-modal.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    BottomSheetComponent,
    CardComponent,
    CreditCardStatusWidgetComponent,
    IncomeVsExpensesWidgetComponent,
    MexicanCurrencyPipe,
    PocketSummaryWidgetComponent,
    QuickActionsWidgetComponent,
    TransferFormModalComponent,
    UrgentPaymentsWidgetComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly balanceService = inject(BalanceService);
  private readonly creditCardStatement = inject(CreditCardStatementService);
  private readonly settingsService = inject(SettingsService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly pocketService = inject(PocketService);
  private readonly monthlyPaymentService = inject(MonthlyPaymentService);
  private readonly incomeService = inject(IncomeService);
  private readonly transferService = inject(TransferService);
  private readonly toast = inject(ToastService);

  protected readonly userName = signal('');
  protected readonly balance = signal<MonthlyBalance | null>(null);
  protected readonly pockets = signal<Pocket[]>([]);
  protected readonly paymentMethods = signal<PaymentMethod[]>([]);
  protected readonly monthlyPayments = signal<MonthlyPayment[]>([]);
  protected readonly transferOpen = signal(false);
  protected readonly monthlyIncome = signal(0);
  protected readonly monthlyExpenses = signal(0);
  protected readonly pocketBaseIncome = signal(0);
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
    const income = this.pocketBaseIncome();
    const usage = this.expensesByPocket();
    return this.pockets().map((pocket) => {
      const assigned = Math.round(income * (pocket.percentage / 100) * 100) / 100;
      const used = usage.get(pocket.id ?? -1) ?? 0;
      return {
        id: pocket.id ?? 0,
        name: pocket.name,
        icon: pocket.icon,
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
        allTransfers,
      ] = await Promise.all([
        this.balanceService.calculate(month, year),
        this.pocketService.getAll(),
        this.paymentMethodService.getAll(),
        this.monthlyPaymentService.getByMonth(month, year),
        this.incomeService.getByMonth(month, year),
        database.expenses.toArray(),
        database.installmentPlans.toArray(),
        database.transfers.toArray(),
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
      this.pocketBaseIncome.set(
        incomes.reduce((sum, income) => sum + income.amount, 0),
      );
      this.monthlyExpenses.set(
        this.sumMonthExpenses(expenses, month, year),
      );
      this.expensesByPocket.set(this.buildExpensesByPocket(expenses, month, year));
      this.creditCardEntries.set(
        this.buildCreditCardEntries(methods, expenses, installmentPlans, allTransfers, month, year),
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
    installmentPlans: readonly { paymentMethodId: number; amount: number; customAmount?: number; cutoffMonth: number; cutoffYear: number; paid: boolean }[],
    allTransfers: readonly Transfer[],
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
              !expense.hidden &&
              expense.date >= range.startIso &&
              expense.date <= range.endIso,
          )
          .reduce((sum, expense) => sum + expense.amount, 0);
        const installmentSum = installmentPlans
          .filter(
            (plan) =>
              plan.paymentMethodId === cardId &&
              plan.cutoffYear === year &&
              plan.cutoffMonth === month &&
              !plan.paid,
          )
          .reduce((sum, plan) => sum + (plan.customAmount ?? plan.amount), 0);
        const paymentDueDate = this.formatPaymentDate(
          this.creditCardStatement.getPaymentDueDate(card),
        );
        const amountToPay = this.creditCardStatement.getAmountToPay(card, allTransfers);
        return {
          id: cardId,
          name: card.name,
          availableCredit: card.availableCredit ?? 0,
          paymentDueDate,
          periodCharges: Math.round((directSum + installmentSum) * 100) / 100,
          statementClosingDay: card.statementClosingDay ?? 1,
          amountToPay,
        };
      });
  }

  private formatPaymentDate(iso: string): string {
    if (!iso) return '—';
    const [, mm, dd] = iso.split('-');
    return `${dd}/${mm}`;
  }

  protected openTransfer(): void {
    this.transferOpen.set(true);
  }

  protected closeTransfer(): void {
    this.transferOpen.set(false);
  }

  protected async onTransferSaved(transfer: Transfer): Promise<void> {
    try {
      await this.transferService.create(transfer);
      this.toast.show('Traspaso realizado.');
      this.closeTransfer();
      const month = this.currentMonth();
      const year = this.currentYear();
      await this.loadAll(month, year);
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'No se pudo realizar el traspaso.');
    }
  }
}
