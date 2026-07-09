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
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
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
    ConfirmDialogComponent,
    FabComponent,
    IconButtonDirective,
    ListItemComponent,
    MexicanCurrencyPipe,
    ProgressBarComponent,
  ],
  templateUrl: './budgets-list.component.html',
  styleUrl: './budgets-list.component.scss',
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
  protected readonly confirmOpen = signal(false);
  protected readonly confirmMessage = signal('');
  protected readonly confirmAction = signal<(() => void) | null>(null);

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
    return pocket ? pocket.name : 'Bolsillo eliminado';
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

  protected confirmDelete(budget: Budget): void {
    this.confirmMessage.set(`¿Eliminar el presupuesto de "${budget.category}"? Esta acción no se puede deshacer.`);
    this.confirmAction.set(() => {
      if (budget.id === undefined) return;
      void (async () => {
        try {
          await this.service.delete(budget.id!);
          this.toast.show('Presupuesto eliminado.');
          await this.loadProgress(this.currentMonth(), this.currentYear());
        } catch (error) {
          this.toast.show(error instanceof Error ? error.message : 'No se pudo eliminar el presupuesto.');
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

  private async load(): Promise<void> {
    this.pockets.set(await this.pocketService.getAll());
    await this.loadProgress(this.currentMonth(), this.currentYear());
  }

  private async loadProgress(month: number, year: number): Promise<void> {
    const expenses = await database.expenses.toArray();
    this.progress.set(await this.service.getProgressForMonth(month, year, expenses));
  }
}
