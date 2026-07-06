import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';

import { EXPENSE_CATEGORIES } from '../../core/catalogs';
import { database } from '../../core/database/bolsi.database';
import type { Budget } from '../../core/models/budget.model';
import type { Expense } from '../../core/models/expense.model';
import type { Pocket } from '../../core/models/pocket.model';
import { BudgetService, type BudgetProgress } from '../../core/services/budget.service';
import { PocketService } from '../../core/services/pocket.service';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { FabComponent } from '../../shared/components/fab/fab.component';
import { IconButtonDirective } from '../../shared/components/icon-button/icon-button.directive';
import { ListItemComponent } from '../../shared/components/list-item/list-item.component';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { MexicanCurrencyPipe } from '../../shared/pipes/mexican-currency.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { BudgetFormModalComponent } from './budget-form-modal.component';

@Component({
  selector: 'app-budgets-list',
  imports: [
    BottomSheetComponent,
    BudgetFormModalComponent,
    CardComponent,
    FabComponent,
    IconButtonDirective,
    ListItemComponent,
    MexicanCurrencyPipe,
    ProgressBarComponent,
  ],
  template: `
    <div class="app-screen">
      <header class="app-screen-header">
        <h1>Presupuestos</h1>
        <span class="screen-period">{{ periodLabel() }}</span>
      </header>
      <main class="app-screen-content">
        @if (progress().length === 0) {
          <app-card title="Sin presupuestos">
            <p class="empty">No tienes presupuestos este mes. Toca + para agregar uno.</p>
          </app-card>
        } @else {
          <ul class="budget-list" aria-label="Presupuestos del mes">
            @for (entry of progress(); track entry.budget.id) {
              <li class="budget-item">
                <app-list-item
                  icon="savings"
                  [title]="entry.budget.category"
                  [subtitle]="subtitleFor(entry)"
                />
                <button
                  appIconButton
                  type="button"
                  aria-label="Editar presupuesto"
                  (click)="openEdit(entry.budget)"
                >
                  <span class="material-symbols-outlined icon icon--small" aria-hidden="true">edit</span>
                </button>
                <button
                  appIconButton
                  type="button"
                  aria-label="Eliminar presupuesto"
                  (click)="confirmDelete(entry.budget)"
                >
                  <span class="material-symbols-outlined icon icon--small" aria-hidden="true">delete</span>
                </button>
                <div class="budget-progress">
                  <app-progress-bar [value]="entry.actual" [max]="entry.budget.estimatedAmount" />
                  <p class="budget-numbers" [class.budget-numbers--over]="entry.ratio > 1">
                    <span>{{ entry.actual | mexicanCurrency }} de {{ entry.budget.estimatedAmount | mexicanCurrency }}</span>
                    <span class="budget-percent">{{ percentLabel(entry.ratio) }}</span>
                  </p>
                </div>
              </li>
            }
          </ul>
        }
      </main>
      <app-fab icon="add" ariaLabel="Agregar presupuesto" (press)="openAdd()" />
    </div>

    @if (modalOpen()) {
      <app-bottom-sheet
        [title]="editingBudget() ? 'Editar presupuesto' : 'Nuevo presupuesto'"
        (close)="closeModal()"
      >
        <app-budget-form-modal
          [budget]="editingBudget()"
          [pockets]="pockets()"
          [month]="currentMonth()"
          [year]="currentYear()"
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
      .empty {
        margin: 0;
        color: var(--text-secondary);
        text-align: center;
        padding: var(--space-2) 0;
      }
      .budget-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .budget-item {
        background: var(--surface);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-large);
        padding: var(--space-2) var(--space-4);
        display: grid;
        grid-template-columns: 1fr auto auto;
        gap: var(--space-2);
        align-items: center;
      }
      .budget-item app-list-item { padding: 0; }
      .budget-progress {
        grid-column: 1 / -1;
        margin-top: var(--space-1);
      }
      .budget-numbers {
        display: flex;
        justify-content: space-between;
        margin: var(--space-1) 0 0;
        font-size: var(--text-size-extra-small);
        color: var(--text-secondary);
      }
      .budget-numbers--over { color: var(--color-danger); font-weight: 600; }
      .budget-percent {
        font-family: var(--font-family-mono);
        font-weight: 600;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetsListComponent {
  private readonly service = inject(BudgetService);
  private readonly pocketService = inject(PocketService);
  private readonly toast = inject(ToastService);

  protected readonly progress = signal<BudgetProgress[]>([]);
  protected readonly pockets = signal<Pocket[]>([]);
  protected readonly currentMonth = signal(new Date().getMonth() + 1);
  protected readonly currentYear = signal(new Date().getFullYear());
  protected readonly editingBudget = signal<Budget | null>(null);
  protected readonly modalOpen = signal(false);

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
      const month = this.currentMonth();
      const year = this.currentYear();
      void this.loadProgress(month, year);
    });
  }

  protected subtitleFor(entry: BudgetProgress): string {
    if (entry.budget.pocketId === 0) {
      return 'Todos los bolsillos';
    }
    const pocket = this.pockets().find((p) => p.id === entry.budget.pocketId);
    return pocket ? `${pocket.emoji} ${pocket.name}` : 'Bolsillo eliminado';
  }

  protected percentLabel(ratio: number): string {
    return `${Math.round(ratio * 100)}%`;
  }

  protected openAdd(): void {
    this.editingBudget.set(null);
    this.modalOpen.set(true);
  }

  protected openEdit(budget: Budget): void {
    this.editingBudget.set(budget);
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.editingBudget.set(null);
    this.modalOpen.set(false);
  }

  protected async onSaved(updated: Budget): Promise<void> {
    const editing = this.editingBudget();
    try {
      if (editing) {
        await this.service.update(updated);
        this.toast.show('Presupuesto actualizado.');
      } else {
        await this.service.create(updated);
        this.toast.show('Presupuesto agregado.');
      }
      this.closeModal();
      await this.loadProgress(this.currentMonth(), this.currentYear());
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'No se pudo guardar el presupuesto.');
    }
  }

  protected async confirmDelete(budget: Budget): Promise<void> {
    const confirmed = window.confirm(
      `¿Eliminar el presupuesto de "${budget.category}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed || budget.id === undefined) {
      return;
    }
    try {
      await this.service.delete(budget.id);
      this.toast.show('Presupuesto eliminado.');
      await this.loadProgress(this.currentMonth(), this.currentYear());
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'No se pudo eliminar el presupuesto.');
    }
  }

  private async load(): Promise<void> {
    this.pockets.set(await this.pocketService.getAll());
    await this.loadProgress(this.currentMonth(), this.currentYear());
  }

  private async loadProgress(month: number, year: number): Promise<void> {
    const expenses = await database.expenses.toArray();
    this.progress.set(await this.service.getProgressForMonth(month, year, expenses));
  }
}
