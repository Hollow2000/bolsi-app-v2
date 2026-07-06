import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';

import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../../core/catalogs';
import type { Budget } from '../../core/models/budget.model';
import type { Pocket } from '../../core/models/pocket.model';
import { ButtonDirective } from '../../shared/components/button/button.directive';
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
    NumberInputComponent,
    SelectInputComponent,
  ],
  template: `
    <app-select-input
      label="Categoría"
      [valueType]="'string'"
      [value]="category()"
      (valueChange)="category.set($any($event))"
    >
      @for (item of categories; track item) {
        <option [value]="item" [selected]="item === category()">{{ item }}</option>
      }
    </app-select-input>

    <app-select-input
      label="Bolsillo"
      [valueType]="'number'"
      [value]="pocketId()"
      (valueChange)="pocketId.set($any($event))"
    >
      <option [value]="0" [selected]="pocketId() === 0">Todos los bolsillos</option>
      @for (pocket of pockets(); track pocket.id) {
        <option [value]="pocket.id" [selected]="pocket.id === pocketId()">
          {{ pocket.emoji }} {{ pocket.name }}
        </option>
      }
    </app-select-input>

    <app-number-input
      label="Monto estimado"
      placeholder="0.00"
      [min]="0"
      [value]="estimatedAmount()"
      (valueChange)="estimatedAmount.set($event)"
    />

    @if (errorMessage(); as message) {
      <p class="modal-error" role="alert">{{ message }}</p>
    }

    <div class="modal-actions">
      <button appButton variant="secondary" type="button" (click)="onCancel()">
        Cancelar
      </button>
      <button appButton variant="primary" type="button" (click)="onSave()">
        {{ submitLabel() }}
      </button>
    </div>
  `,
  styles: [
    `
      :host { display: flex; flex-direction: column; gap: var(--space-3); }
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
export class BudgetFormModalComponent implements OnInit {
  readonly pockets = input.required<readonly Pocket[]>();
  readonly budget = input<Budget | null>(null);
  readonly month = input.required<number>();
  readonly year = input.required<number>();
  readonly cancel = output<void>();
  readonly saved = output<Budget>();

  protected readonly categories = EXPENSE_CATEGORIES;
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly category = signal<ExpenseCategory>(EXPENSE_CATEGORIES[0]);
  protected readonly pocketId = signal<number>(0);
  protected readonly estimatedAmount = signal(0);

  ngOnInit(): void {
    const initial = this.budget();
    if (initial) {
      this.category.set(initial.category as ExpenseCategory);
      this.pocketId.set(initial.pocketId);
      this.estimatedAmount.set(initial.estimatedAmount);
    }
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
