import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';

import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../core/catalogs';
import type { Expense } from '../../core/models/expense.model';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import type { Pocket } from '../../core/models/pocket.model';
import { ExpenseService } from '../../core/services/expense.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { PocketService } from '../../core/services/pocket.service';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { FabComponent } from '../../shared/components/fab/fab.component';
import { IconButtonDirective } from '../../shared/components/icon-button/icon-button.directive';
import { ListItemComponent } from '../../shared/components/list-item/list-item.component';
import { MexicanCurrencyPipe } from '../../shared/pipes/mexican-currency.pipe';
import { SelectInputComponent } from '../../shared/components/select-input/select-input.component';
import { ToastService } from '../../shared/services/toast.service';
import { ExpenseFormModalComponent } from './expense-form-modal.component';

interface FilterState {
  readonly pocketId: number;
  readonly paymentMethodId: number;
  readonly category: string;
}

const NO_FILTER = 0;
const NO_CATEGORY = '';

@Component({
  selector: 'app-expenses-list',
  imports: [
    BottomSheetComponent,
    CardComponent,
    ExpenseFormModalComponent,
    FabComponent,
    IconButtonDirective,
    ListItemComponent,
    MexicanCurrencyPipe,
    SelectInputComponent,
  ],
  template: `
    <div class="app-screen">
      <header class="app-screen-header">
        <h1>Gastos</h1>
        <span class="screen-period">{{ periodLabel() }}</span>
      </header>
      <main class="app-screen-content">
        <app-card title="Total del mes">
          <p class="total-amount">{{ totalSpent() | mexicanCurrency }}</p>
          <p class="total-subtitle">{{ filteredExpenses().length }} gasto(s) con los filtros actuales</p>
        </app-card>

        <section class="filters" aria-label="Filtros de gastos">
          <app-select-input
            label="Bolsillo"
            [valueType]="'number'"
            [value]="filters().pocketId"
            (valueChange)="setPocketFilter($any($event))"
          >
            <option [value]="0" [selected]="filters().pocketId === 0">Todos los bolsillos</option>
            @for (pocket of pockets(); track pocket.id) {
              <option [value]="pocket.id" [selected]="filters().pocketId === pocket.id">
                {{ pocket.emoji }} {{ pocket.name }}
              </option>
            }
          </app-select-input>

          <app-select-input
            label="Método de pago"
            [valueType]="'number'"
            [value]="filters().paymentMethodId"
            (valueChange)="setPaymentMethodFilter($any($event))"
          >
            <option [value]="0" [selected]="filters().paymentMethodId === 0">Todos los métodos</option>
            @for (method of paymentMethods(); track method.id) {
              <option [value]="method.id" [selected]="filters().paymentMethodId === method.id">
                {{ method.name }}
              </option>
            }
          </app-select-input>

          <app-select-input
            label="Categoría"
            [valueType]="'string'"
            [value]="filters().category"
            (valueChange)="setCategoryFilter($any($event))"
          >
            <option [value]="''" [selected]="filters().category === ''">Todas las categorías</option>
            @for (category of allCategories; track category) {
              <option [value]="category" [selected]="filters().category === category">
                {{ category }}
              </option>
            }
          </app-select-input>
        </section>

        @if (filteredExpenses().length === 0) {
          <app-card title="Sin gastos">
            <p class="empty-message">
              @if (expenses().length === 0) {
                Aún no has registrado gastos este mes.
              } @else {
                Ningún gasto coincide con los filtros aplicados.
              }
            </p>
          </app-card>
        } @else {
          <ul class="app-list" aria-label="Gastos del mes">
            @for (expense of filteredExpenses(); track expense.id) {
              <li class="app-list-row">
                <app-list-item
                  icon="shopping_bag"
                  [title]="expense.description"
                  [subtitle]="subtitleFor(expense)"
                  [amount]="(expense.amount | mexicanCurrency) ?? ''"
                  tone="expense"
                />
                <div class="item-actions">
                  <button
                    appIconButton
                    type="button"
                    aria-label="Editar gasto"
                    (click)="openEdit(expense)"
                  >
                    <span class="material-symbols-outlined icon icon--small" aria-hidden="true">edit</span>
                  </button>
                  <button
                    appIconButton
                    type="button"
                    aria-label="Eliminar gasto"
                    (click)="confirmDelete(expense)"
                  >
                    <span class="material-symbols-outlined icon icon--small" aria-hidden="true">delete</span>
                  </button>
                </div>
              </li>
            }
          </ul>
        }
      </main>
      <app-fab icon="add" ariaLabel="Registrar nuevo gasto" (press)="openAdd()" />
    </div>

    @if (modalOpen()) {
      <app-bottom-sheet
        [title]="editingExpense() ? 'Editar gasto' : 'Nuevo gasto'"
        (close)="closeModal()"
      >
        <app-expense-form-modal
          [paymentMethods]="paymentMethods()"
          [pockets]="pockets()"
          [expense]="editingExpense()"
          (cancel)="closeModal()"
          (saved)="onSaved($event)"
        />
      </app-bottom-sheet>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .screen-period {
        font-size: var(--text-size-small);
        color: var(--text-secondary);
      }
      .total-amount {
        margin: 0;
        font-size: var(--text-size-extra-large);
        font-weight: 700;
        color: var(--text-primary);
        font-family: var(--font-family-mono);
      }
      .total-subtitle {
        margin: 0;
        font-size: var(--text-size-small);
        color: var(--text-secondary);
      }
      .filters {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: var(--space-3);
      }
      .empty-message {
        margin: 0;
        color: var(--text-secondary);
        text-align: center;
        padding: var(--space-2) 0;
      }
      @media (max-width: 520px) {
        .filters { grid-template-columns: 1fr; }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensesListComponent {
  private readonly expenseService = inject(ExpenseService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly pocketService = inject(PocketService);
  private readonly toast = inject(ToastService);

  protected readonly allCategories = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])];

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

  protected readonly filteredExpenses = computed(() => {
    const filter = this.filters();
    return this.expenses().filter((expense) => {
      if (filter.pocketId !== NO_FILTER && expense.pocketId !== filter.pocketId) return false;
      if (filter.paymentMethodId !== NO_FILTER && expense.paymentMethodId !== filter.paymentMethodId) return false;
      if (filter.category !== NO_CATEGORY && expense.category !== filter.category) return false;
      return true;
    });
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

  protected subtitleFor(expense: Expense): string {
    const method = this.paymentMethods().find((method) => method.id === expense.paymentMethodId);
    const pocket = this.pockets().find((pocket) => pocket.id === expense.pocketId);
    const methodName = method?.name ?? '—';
    const pocketName = pocket ? `${pocket.emoji} ${pocket.name}` : '—';
    return `${pocketName} · ${methodName} · ${expense.category}`;
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

  protected async confirmDelete(expense: Expense): Promise<void> {
    const confirmed = window.confirm(
      `¿Eliminar el gasto "${expense.description}"? El saldo del método de pago se restaurará.`,
    );
    if (!confirmed) {
      return;
    }
    try {
      await this.expenseService.delete(expense);
      this.toast.show('Gasto eliminado.');
      await this.loadExpenses(this.currentMonth(), this.currentYear());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el gasto.';
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
