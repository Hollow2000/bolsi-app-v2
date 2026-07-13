import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';

import { EXPENSE_CATEGORIES_DEFAULT, INCOME_CATEGORIES_DEFAULT } from '../../core/services/catalog.service';
import type { Expense } from '../../core/models/expense.model';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import type { Pocket } from '../../core/models/pocket.model';
import { ExpenseService } from '../../core/services/expense.service';
import { ExpenseTemplateService } from '../../core/services/expense-template.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { PocketService } from '../../core/services/pocket.service';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ExpenseFormModalComponent } from './expense-form-modal.component';
import { FabComponent } from '../../shared/components/fab/fab.component';
import { MexicanCurrencyPipe } from '../../shared/pipes/mexican-currency.pipe';
import { SelectInputComponent } from '../../shared/components/select-input/select-input.component';
import { ToastService } from '../../shared/services/toast.service';
import { InstallPromptComponent } from '../../shared/components/install-prompt/install-prompt.component';

interface FilterState {
  readonly pocketId: number;
  readonly paymentMethodId: number;
  readonly category: string;
}

interface DayGroup {
  readonly date: string;
  readonly label: string;
  readonly expenses: Expense[];
  readonly total: number;
}

const NO_FILTER = 0;
const NO_CATEGORY = '';

@Component({
  selector: 'app-expenses-list',
  imports: [
    BottomSheetComponent,
    CardComponent,
    ConfirmDialogComponent,
    ExpenseFormModalComponent,
    FabComponent,
    MexicanCurrencyPipe,
    SelectInputComponent,
    InstallPromptComponent,
  ],
  templateUrl: './expenses-list.component.html',
  styleUrl: './expenses-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensesListComponent {
  private readonly expenseService = inject(ExpenseService);
  private readonly templateService = inject(ExpenseTemplateService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly pocketService = inject(PocketService);
  private readonly toast = inject(ToastService);

  protected readonly allCategories = [...new Set([...EXPENSE_CATEGORIES_DEFAULT, ...INCOME_CATEGORIES_DEFAULT])];

  protected readonly expenses = signal<Expense[]>([]);
  protected readonly paymentMethods = signal<PaymentMethod[]>([]);
  protected readonly pockets = signal<Pocket[]>([]);
  protected readonly currentMonth = signal(new Date().getMonth() + 1);
  protected readonly currentYear = signal(new Date().getFullYear());

  protected readonly filters = signal<FilterState>({
    pocketId: NO_FILTER,
    paymentMethodId: NO_FILTER,
    category: NO_CATEGORY,
  });

  protected readonly modalOpen = signal(false);
  protected readonly editingExpense = signal<Expense | null>(null);
  protected readonly confirmOpen = signal(false);
  protected readonly confirmMessage = signal('');
  protected readonly confirmAction = signal<(() => void) | null>(null);

  protected readonly filteredExpenses = computed(() => {
    const filter = this.filters();
    return this.expenses()
      .filter((expense) => {
        if (filter.pocketId !== NO_FILTER && expense.pocketId !== filter.pocketId) return false;
        if (filter.paymentMethodId !== NO_FILTER && expense.paymentMethodId !== filter.paymentMethodId) return false;
        if (filter.category !== NO_CATEGORY && expense.category !== filter.category) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  });

  protected readonly dayGroups = computed<DayGroup[]>(() => {
    const expenses = this.filteredExpenses();
    const groups = new Map<string, Expense[]>();
    for (const expense of expenses) {
      const existing = groups.get(expense.date);
      if (existing) {
        existing.push(expense);
      } else {
        groups.set(expense.date, [expense]);
      }
    }
    return Array.from(groups.entries()).map(([date, items]) => ({
      date,
      label: this.formatDayLabel(date),
      expenses: items,
      total: Math.round(items.reduce((sum, e) => sum + e.amount, 0) * 100) / 100,
    }));
  });

  protected readonly totalSpent = computed(() =>
    this.filteredExpenses().reduce((sum, expense) => sum + expense.amount, 0),
  );

  protected readonly periodLabel = computed(() => {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    return `${monthNames[this.currentMonth() - 1]} ${this.currentYear()}`;
  });

  constructor() {
    void this.load();
    effect(() => {
      // Re-load expenses when the month or year changes.
      const month = this.currentMonth();
      const year = this.currentYear();
      void this.loadExpenses(month, year);
    });
  }

  protected setPocketFilter(id: number): void {
    this.filters.update((current) => ({ ...current, pocketId: id }));
  }

  protected setPaymentMethodFilter(id: number): void {
    this.filters.update((current) => ({ ...current, paymentMethodId: id }));
  }

  protected setCategoryFilter(category: string): void {
    this.filters.update((current) => ({ ...current, category }));
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

  protected formatDate(iso: string): string {
    const [, mm, dd] = iso.split('-');
    return `${dd}/${mm}`;
  }

  protected formatDayLabel(iso: string): string {
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    const [year, month, day] = iso.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayName = dayNames[date.getDay()];
    return `${dayName} ${day} de ${monthNames[month - 1]}`;
  }

  protected getPocketName(pocketId: number): string {
    return this.pockets().find((p) => p.id === pocketId)?.name ?? '—';
  }

  protected getMethodName(methodId: number): string {
    return this.paymentMethods().find((m) => m.id === methodId)?.name ?? '—';
  }

  protected openAdd(): void {
    this.editingExpense.set(null);
    this.modalOpen.set(true);
  }

  protected openEdit(expense: Expense): void {
    this.editingExpense.set(expense);
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
    this.editingExpense.set(null);
  }

  protected async onSaved(updated: Expense): Promise<void> {
    const editing = this.editingExpense();
    try {
      if (editing) {
        await this.expenseService.update(editing, updated);
        this.toast.show('Gasto actualizado.');
      } else {
        await this.expenseService.create(updated);
        this.toast.show('Gasto registrado.');
      }
      this.closeModal();
      await this.loadExpenses(this.currentMonth(), this.currentYear());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el gasto.';
      this.toast.show(message);
    }
  }

  protected confirmDelete(expense: Expense): void {
    this.confirmMessage.set(`¿Eliminar el gasto "${expense.description}"? El saldo del método de pago se restaurará.`);
    this.confirmAction.set(() => {
      void (async () => {
        try {
          await this.expenseService.delete(expense);
          this.toast.show('Gasto eliminado.');
          await this.loadExpenses(this.currentMonth(), this.currentYear());
        } catch (error) {
          const message = error instanceof Error ? error.message : 'No se pudo eliminar el gasto.';
          this.toast.show(message);
        }
      })();
    });
    this.confirmOpen.set(true);
  }

  protected onConfirm(): void {
    this.confirmAction()?.();
    this.confirmOpen.set(false);
    this.confirmAction.set(null);
  }

  protected onCancelConfirm(): void {
    this.confirmOpen.set(false);
    this.confirmAction.set(null);
  }

  protected async saveAsTemplate(expense: Expense): Promise<void> {
    try {
      await this.templateService.saveFromExpense(expense, 'star');
      this.toast.show(`Plantilla "${expense.description}" creada.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear la plantilla.';
      this.toast.show(message);
    }
  }

  private async load(): Promise<void> {
    const [methods, pockets] = await Promise.all([
      this.paymentMethodService.getAll(),
      this.pocketService.getAll(),
    ]);
    this.paymentMethods.set(methods);
    this.pockets.set(pockets);
    await this.loadExpenses(this.currentMonth(), this.currentYear());
  }

  private async loadExpenses(month: number, year: number): Promise<void> {
    this.expenses.set(await this.expenseService.getByMonth(month, year));
  }
}
