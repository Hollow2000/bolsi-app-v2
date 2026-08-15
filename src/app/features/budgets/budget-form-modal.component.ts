import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';

import type { CatalogItem } from '../../core/models/catalog.model';
import type { Budget } from '../../core/models/budget.model';
import type { Pocket } from '../../core/models/pocket.model';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { CategorySelectorComponent } from '../../shared/components/category-selector/category-selector.component';
import { NumberInputComponent } from '../../shared/components/number-input/number-input.component';
import { SelectInputComponent } from '../../shared/components/select-input/select-input.component';

/**
 * Pure presentational form for creating or editing a per-category
 * budget. The parent supplies the list of pockets; the modal never
 * reads from the database. If `budget` is provided, the form is
 * pre-filled; otherwise it starts empty for adding.
 */
@Component({
  selector: 'app-budget-form-modal',
  imports: [
    ButtonDirective,
    CategorySelectorComponent,
    NumberInputComponent,
    SelectInputComponent,
  ],
  templateUrl: './budget-form-modal.component.html',
  styleUrl: './budget-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetFormModalComponent implements OnInit {
  readonly pockets = input.required<readonly Pocket[]>();
  readonly budget = input<Budget | null>(null);
  readonly month = input.required<number>();
  readonly year = input.required<number>();
  readonly cancel = output<void>();
  readonly saved = output<Budget>();

  protected readonly errorMessage = signal<string | null>(null);

  protected readonly category = signal('');
  protected readonly categoryIcon = signal('category');
  protected readonly pocketId = signal<number>(0);
  protected readonly estimatedAmount = signal(0);

  ngOnInit(): void {
    const initial = this.budget();
    if (initial) {
      this.category.set(initial.category);
      this.pocketId.set(initial.pocketId);
      this.estimatedAmount.set(initial.estimatedAmount);
    }
  }

  protected onCategorySelected(cat: CatalogItem): void {
    this.category.set(cat.name);
    this.categoryIcon.set(cat.icon);
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  protected submitLabel(): string {
    return this.budget() ? 'Guardar cambios' : 'Agregar presupuesto';
  }

  protected onSave(): void {
    this.errorMessage.set(null);
    const amount = Math.round(this.estimatedAmount() * 100) / 100;
    if (amount <= 0) {
      this.errorMessage.set('El monto estimado debe ser mayor a 0.');
      return;
    }
    const initial = this.budget();
    const updated: Budget = {
      ...(initial ?? {}),
      month: this.month(),
      year: this.year(),
      category: this.category(),
      pocketId: this.pocketId(),
      estimatedAmount: amount,
    };
    if (initial?.id !== undefined) {
      updated.id = initial.id;
    }
    this.saved.emit(updated);
  }
}
