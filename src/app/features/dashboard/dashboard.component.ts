import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { database } from '../../core/database/bolsi.database';
import type { Expense } from '../../core/models/expense.model';
import type { ExpenseTemplate } from '../../core/models/expense-template.model';
import type { Income } from '../../core/models/income.model';
import type { MonthlyBalance } from '../../core/models/monthly-balance.model';
import type { MonthlyPayment } from '../../core/models/monthly-payment.model';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import type { Pocket } from '../../core/models/pocket.model';
import type { Transfer } from '../../core/models/transfer.model';
import { BalanceService } from '../../core/services/balance.service';
import { CreditCardStatementService } from '../../core/services/credit-card-statement.service';
import { ExpenseService } from '../../core/services/expense.service';
import { ExpenseTemplateService } from '../../core/services/expense-template.service';
import { IncomeService } from '../../core/services/income.service';
import { MonthlyPaymentService } from '../../core/services/monthly-payment.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { PocketService } from '../../core/services/pocket.service';
import { SettingsService } from '../../core/services/settings.service';
import { TransferService } from '../../core/services/transfer.service';
import { SavingsService, type PendingScheduledSaving } from '../../core/services/savings.service';
import type { SavingsAccount } from '../../core/models/savings-account.model';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { CardComponent } from '../../shared/components/card/card.component';
import { NumberInputComponent } from '../../shared/components/number-input/number-input.component';
import { SelectInputComponent } from '../../shared/components/select-input/select-input.component';
import { SpeedDialFabComponent } from '../../shared/components/speed-dial-fab/speed-dial-fab.component';
import { TemplateSelectorComponent } from '../../shared/components/template-selector/template-selector.component';
import { ToastService } from '../../shared/services/toast.service';
import { MexicanCurrencyPipe } from '../../shared/pipes/mexican-currency.pipe';
import { CreditCardStatusWidgetComponent, type CreditCardStatusEntry } from './widgets/credit-card-status-widget.component';
import { IncomeVsExpensesWidgetComponent } from './widgets/income-vs-expenses-widget.component';
import { PocketSummaryWidgetComponent, type PocketSummaryEntry } from './widgets/pocket-summary-widget.component';
import { UrgentPaymentsWidgetComponent } from './widgets/urgent-payments-widget.component';
import { ExpenseFormModalComponent } from '../expenses/expense-form-modal.component';
import { EditIncomeModalComponent } from '../income/edit-income-modal.component';
import { TransferFormModalComponent } from '../transfers/transfer-form-modal.component';
import { InstallPromptComponent } from '../../shared/components/install-prompt/install-prompt.component';
import { YieldPromptModalComponent } from '../../shared/components/yield-prompt-modal/yield-prompt-modal.component';
import { QuickSavingsFormComponent } from '../../shared/components/quick-savings-form/quick-savings-form.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    BottomSheetComponent,
    ButtonDirective,
    CardComponent,
    CreditCardStatusWidgetComponent,
    EditIncomeModalComponent,
    ExpenseFormModalComponent,
    IncomeVsExpensesWidgetComponent,
    MexicanCurrencyPipe,
    NumberInputComponent,
    PocketSummaryWidgetComponent,
    SelectInputComponent,
    SpeedDialFabComponent,
    TemplateSelectorComponent,
    TransferFormModalComponent,
    UrgentPaymentsWidgetComponent,
    InstallPromptComponent,
    YieldPromptModalComponent,
    QuickSavingsFormComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly router = inject(Router);
  private readonly balanceService = inject(BalanceService);
  private readonly creditCardStatement = inject(CreditCardStatementService);
  private readonly settingsService = inject(SettingsService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly pocketService = inject(PocketService);
  private readonly monthlyPaymentService = inject(MonthlyPaymentService);
  private readonly incomeService = inject(IncomeService);
  private readonly expenseService = inject(ExpenseService);
  private readonly expenseTemplateService = inject(ExpenseTemplateService);
  private readonly transferService = inject(TransferService);
  private readonly savingsService = inject(SavingsService);
  private readonly toast = inject(ToastService);

  protected readonly userName = signal('');
  protected readonly balance = signal<MonthlyBalance | null>(null);
  protected readonly pockets = signal<Pocket[]>([]);
  protected readonly paymentMethods = signal<PaymentMethod[]>([]);
  protected readonly monthlyPayments = signal<MonthlyPayment[]>([]);
  protected readonly templates = signal<ExpenseTemplate[]>([]);
  protected readonly transferOpen = signal(false);
  protected readonly expenseFormOpen = signal(false);
  protected readonly incomeFormOpen = signal(false);
  protected readonly templateListOpen = signal(false);
  protected readonly editingExpense = signal<Expense | null>(null);
  protected readonly monthlyIncome = signal(0);
  protected readonly monthlyPendingIncome = signal(0);
  protected readonly monthlyExpenses = signal(0);
  protected readonly pocketBaseIncome = signal(0);
  protected readonly creditCardEntries = signal<CreditCardStatusEntry[]>([]);

  protected readonly currentMonth = signal(new Date().getMonth() + 1);
  protected readonly currentYear = signal(new Date().getFullYear());

  protected readonly yieldPromptOpen = signal(false);
  protected readonly yieldAccount = signal<SavingsAccount | null>(null);
  protected readonly savingsAccountsNeedingYield = signal<SavingsAccount[]>([]);

  protected readonly quickSavingsFormOpen = signal(false);
  protected readonly savingsAccounts = signal<SavingsAccount[]>([]);
  protected readonly dueScheduledSavings = signal<PendingScheduledSaving[]>([]);
  protected readonly showScheduledSavingBanner = signal(false);

  protected readonly confirmScheduledSavingOpen = signal(false);
  protected readonly confirmScheduledSavingAccount = signal<SavingsAccount | null>(null);
  protected readonly confirmScheduledSavingAmount = signal(0);
  protected readonly confirmScheduledSavingPaymentMethodId = signal(0);
  protected readonly confirmScheduledSavingOccurrenceIndex = signal(0);
  protected readonly confirmScheduledSavingError = signal<string | null>(null);

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
    receivedIncome: this.monthlyIncome(),
    pendingIncome: this.monthlyPendingIncome(),
    expenses: this.monthlyExpenses(),
  }));

  protected readonly receivableMethods = computed(() =>
    this.paymentMethods().filter((method) => method.type !== 'credit'),
  );

  protected readonly originPaymentMethods = computed(() =>
    this.paymentMethods().filter((method) => method.type === 'cash' || method.type === 'debit'),
  );

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
        templates,
      ] = await Promise.all([
        this.balanceService.calculate(month, year),
        this.pocketService.getAll(),
        this.paymentMethodService.getAll(),
        this.monthlyPaymentService.getByMonth(month, year),
        this.incomeService.getByMonth(month, year),
        database.expenses.toArray(),
        database.installmentPlans.toArray(),
        database.transfers.toArray(),
        this.expenseTemplateService.getAll(),
      ]);
      this.balance.set(balance);
      this.pockets.set(pockets);
      this.paymentMethods.set(methods);
      this.monthlyPayments.set(payments);
      this.templates.set(templates);
      this.monthlyIncome.set(
        incomes
          .filter((income) => income.status === 'received')
          .reduce((sum, income) => sum + income.amount, 0),
      );
      this.monthlyPendingIncome.set(
        incomes
          .filter((income) => income.status === 'expected')
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

      // Load savings accounts
      const allSavingsAccounts = await this.savingsService.getAll();
      this.savingsAccounts.set(allSavingsAccounts);

      // Check for scheduled savings due
      if (this.isCurrentMonth()) {
        const dueSavings = await this.savingsService.getDueScheduledSavings(month, year);
        this.dueScheduledSavings.set(dueSavings);
        this.showScheduledSavingBanner.set(dueSavings.length > 0);
      } else {
        this.dueScheduledSavings.set([]);
        this.showScheduledSavingBanner.set(false);
      }

      // Check for savings accounts needing yield prompt (only on last days of month)
      const today = new Date();
      const dayOfMonth = today.getDate();
      const isLastDaysOfMonth = dayOfMonth >= 29;
      if (isLastDaysOfMonth) {
        const savingsAccounts = await this.savingsService.getAll();
        const accountsNeedingYield: SavingsAccount[] = [];
        for (const account of savingsAccounts) {
          if (account.id !== undefined) {
            const hasYield = await this.savingsService.hasYieldThisMonth(account.id);
            if (!hasYield) {
              accountsNeedingYield.push(account);
            }
          }
        }
        this.savingsAccountsNeedingYield.set(accountsNeedingYield);
        if (accountsNeedingYield.length > 0 && this.isCurrentMonth()) {
          this.yieldAccount.set(accountsNeedingYield[0]);
          this.yieldPromptOpen.set(true);
        }
      }
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

  protected openExpenseForm(): void {
    this.editingExpense.set(null);
    this.expenseFormOpen.set(true);
  }

  protected closeExpenseForm(): void {
    this.editingExpense.set(null);
    this.expenseFormOpen.set(false);
  }

  protected async onExpenseSaved(expense: Expense): Promise<void> {
    try {
      await this.expenseService.create(expense);
      this.toast.show('Gasto registrado.');
      this.closeExpenseForm();
      const month = this.currentMonth();
      const year = this.currentYear();
      await this.loadAll(month, year);
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'No se pudo registrar el gasto.');
    }
  }

  protected openIncomeForm(): void {
    this.incomeFormOpen.set(true);
  }

  protected closeIncomeForm(): void {
    this.incomeFormOpen.set(false);
  }

  protected async onIncomeSaved(income: Income): Promise<void> {
    try {
      await this.incomeService.create(income);
      this.toast.show('Ingreso registrado.');
      this.closeIncomeForm();
      const month = this.currentMonth();
      const year = this.currentYear();
      await this.loadAll(month, year);
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'No se pudo registrar el ingreso.');
    }
  }

  protected openTemplateList(): void {
    this.templateListOpen.set(true);
  }

  protected closeTemplateList(): void {
    this.templateListOpen.set(false);
  }

  protected isCurrentMonth(): boolean {
    const now = new Date();
    return this.currentMonth() === now.getMonth() + 1 && this.currentYear() === now.getFullYear();
  }

  protected prevMonth(): void {
    if (this.currentMonth() === 1) {
      this.currentMonth.set(12);
      this.currentYear.update((y) => y - 1);
    } else {
      this.currentMonth.update((m) => m - 1);
    }
  }

  protected nextMonth(): void {
    if (this.isCurrentMonth()) return;
    if (this.currentMonth() === 12) {
      this.currentMonth.set(1);
      this.currentYear.update((y) => y + 1);
    } else {
      this.currentMonth.update((m) => m + 1);
    }
  }

  protected onTemplateSelected(template: ExpenseTemplate): void {
    this.closeTemplateList();
    // Open expense form pre-filled with template data
    const now = new Date();
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.editingExpense.set({
      date: iso,
      description: template.description,
      amount: template.amount,
      paymentMethodId: template.paymentMethodId,
      pocketId: template.pocketId,
      category: template.category,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      isInstallment: false,
    });
    this.expenseFormOpen.set(true);
  }

  protected openQuickSavingsForm(): void {
    this.quickSavingsFormOpen.set(true);
  }

  protected closeQuickSavingsForm(): void {
    this.quickSavingsFormOpen.set(false);
  }

  protected async onQuickSavingsSaved(): Promise<void> {
    this.closeQuickSavingsForm();
    const month = this.currentMonth();
    const year = this.currentYear();
    await this.loadAll(month, year);
  }

  protected onYieldSaved(): void {
    const remaining = this.savingsAccountsNeedingYield();
    const current = this.yieldAccount();
    const next = remaining.filter((a) => a.id !== current?.id);
    this.savingsAccountsNeedingYield.set(next);
    if (next.length > 0) {
      this.yieldAccount.set(next[0]);
    } else {
      this.yieldPromptOpen.set(false);
      this.yieldAccount.set(null);
    }
  }

  protected onYieldSkip(): void {
    const remaining = this.savingsAccountsNeedingYield();
    const current = this.yieldAccount();
    const next = remaining.filter((a) => a.id !== current?.id);
    this.savingsAccountsNeedingYield.set(next);
    if (next.length > 0) {
      this.yieldAccount.set(next[0]);
    } else {
      this.yieldPromptOpen.set(false);
      this.yieldAccount.set(null);
    }
  }

  protected async executeScheduledSaving(pending: PendingScheduledSaving): Promise<void> {
    try {
      const accountId = pending.account.id!;
      await this.savingsService.executeScheduledSaving(
        accountId,
        this.currentMonth(),
        this.currentYear(),
        pending.executedCount + 1,
      );
      this.toast.show(`Ahorro "${pending.account.name}" ejecutado.`);
      const month = this.currentMonth();
      const year = this.currentYear();
      await this.loadAll(month, year);
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'Error al ejecutar ahorro.');
    }
  }

  protected frequencyLabel(frequency: string): string {
    switch (frequency) {
      case 'monthly': return 'Mensual';
      case 'biweekly': return 'Quincenal';
      case 'weekly': return 'Semanal';
      default: return '';
    }
  }

  protected openConfirmScheduledSaving(pending: PendingScheduledSaving): void {
    this.confirmScheduledSavingAccount.set(pending.account);
    this.confirmScheduledSavingAmount.set(pending.pendingAmount);
    this.confirmScheduledSavingPaymentMethodId.set(pending.config.paymentMethodId);
    this.confirmScheduledSavingOccurrenceIndex.set(pending.executedCount + 1);
    this.confirmScheduledSavingError.set(null);
    this.confirmScheduledSavingOpen.set(true);
  }

  protected closeConfirmScheduledSaving(): void {
    this.confirmScheduledSavingOpen.set(false);
    this.confirmScheduledSavingAccount.set(null);
    this.confirmScheduledSavingError.set(null);
  }

  protected async confirmAndExecuteScheduledSaving(): Promise<void> {
    const account = this.confirmScheduledSavingAccount();
    const amount = this.confirmScheduledSavingAmount();
    const paymentMethodId = this.confirmScheduledSavingPaymentMethodId();
    const occurrenceIndex = this.confirmScheduledSavingOccurrenceIndex();
    if (!account || account.id === undefined) return;

    if (paymentMethodId === 0) {
      this.confirmScheduledSavingError.set('Selecciona una cuenta de origen.');
      return;
    }

    if (amount <= 0) {
      this.confirmScheduledSavingError.set('El monto debe ser mayor a 0.');
      return;
    }

    // Validate sufficient balance
    const method = this.paymentMethods().find((m) => m.id === paymentMethodId);
    if (method) {
      const available = method.currentBalance ?? 0;
      if (amount > available) {
        this.confirmScheduledSavingError.set(`Saldo insuficiente. Disponible: ${available.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}`);
        return;
      }
    }

    try {
      await this.savingsService.executeScheduledSaving(
        account.id,
        this.currentMonth(),
        this.currentYear(),
        occurrenceIndex,
        amount,
        paymentMethodId,
      );
      this.toast.show(`Ahorro "${account.name}" ejecutado.`);
      this.closeConfirmScheduledSaving();
      const month = this.currentMonth();
      const year = this.currentYear();
      await this.loadAll(month, year);
    } catch (error) {
      this.confirmScheduledSavingError.set(error instanceof Error ? error.message : 'Error al ejecutar ahorro.');
    }
  }
}
