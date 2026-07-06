import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';

import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../../core/catalogs';
import type { Expense } from '../../core/models/expense.model';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import type { Pocket } from '../../core/models/pocket.model';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { DateInputComponent } from '../../shared/components/date-input/date-input.component';
import { NumberInputComponent } from '../../shared/components/number-input/number-input.component';
import { SelectInputComponent } from '../../shared/components/select-input/select-input.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';

/**
 * Form for adding or editing an expense. Pure presentational: the
 * parent owns persistence. The parent supplies the list of available
 * payment methods and pockets; the modal never reads from the
 * database. If `expense` is provided, the form is pre-filled for
 * editing; otherwise it starts empty for adding.
 */
@Component({
  selector: 'app-expense-form-modal',
  imports: [
    ButtonDirective,
    DateInputComponent,
    NumberInputComponent,
    SelectInputComponent,
    TextInputComponent,
  ],
  template: `
    <app-text-input
      label="Descripción"
      [value]="description()"
      (valueChange)="description.set($event)"
    />

    <div class="modal-row">
      <app-number-input
        label="Monto"
        placeholder="0.00"
        [min]="0"
        [value]="amount()"
        (valueChange)="amount.set($event)"
      />
      <app-date-input
        label="Fecha"
        [value]="date()"
        (valueChange)="date.set($event)"
      />
    </div>

    <app-select-input
      label="Método de pago"
      [valueType]="'number'"
      [value]="paymentMethodId()"
      (valueChange)="paymentMethodId.set($any($event))"
    >
      <option value="0" disabled [selected]="paymentMethodId() === 0">Selecciona un método</option>
      @for (method of paymentMethods(); track method.id) {
        <option [value]="method.id" [selected]="method.id === paymentMethodId()">
          {{ method.name }} ({{ typeLabel(method.type) }})
        </option>
      }
    </app-select-input>

    <app-select-input
      label="Bolsillo"
      [valueType]="'number'"
      [value]="pocketId()"
      (valueChange)="pocketId.set($any($event))"
    >
      <option value="0" disabled [selected]="pocketId() === 0">Selecciona un bolsillo</option>
      @for (pocket of pockets(); track pocket.id) {
        <option [value]="pocket.id" [selected]="pocket.id === pocketId()">
          {{ pocket.emoji }} {{ pocket.name }} ({{ pocket.percentage }}%)
        </option>
      }
    </app-select-input>

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
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }
      .modal-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-3);
      }
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
export class ExpenseFormModalComponent implements OnInit {
  readonly paymentMethods = input.required<readonly PaymentMethod[]>();
  readonly pockets = input.required<readonly Pocket[]>();
  readonly expense = input<Expense | null>(null);
  readonly cancel = output<void>();
  readonly saved = output<Expense>();

  protected readonly categories = EXPENSE_CATEGORIES;
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly description = signal('');
  protected readonly amount = signal(0);
  protected readonly date = signal('');
  protected readonly paymentMethodId = signal<number>(0);
  protected readonly pocketId = signal<number>(0);
  protected readonly category = signal<ExpenseCategory>(EXPENSE_CATEGORIES[0]);

  ngOnInit(): void {
    const initial = this.expense();
    if (initial) {
      this.description.set(initial.description);
      this.amount.set(initial.amount);
      this.date.set(initial.date);
      this.paymentMethodId.set(initial.paymentMethodId);
      this.pocketId.set(initial.pocketId);
      this.category.set(initial.category as ExpenseCategory);
    } else {
      this.date.set(this.todayIso());
    }
  }

  protected typeLabel(type: PaymentMethod['type']): string {
    if (type === 'cash') return 'Efectivo';
    if (type === 'debit') return 'Débito';
    return 'Crédito';
  }

  protected submitLabel(): string {
    return this.expense() ? 'Guardar cambios' : 'Agregar gasto';
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  protected onSave(): void {
    this.errorMessage.set(null);
    const description = this.description().trim();
    if (!description) {
      this.errorMessage.set('La descripción es obligatoria.');
      return;
    }
    const amount = this.round(this.amount());
    if (amount <= 0) {
      this.errorMessage.set('El monto debe ser mayor a 0.');
      return;
    }
    const date = this.date();
    const parts = date.split('-').map((segment) => Number(segment));
    if (parts.length !== 3 || parts.some((segment) => !Number.isInteger(segment))) {
      this.errorMessage.set('La fecha no es válida.');
      return;
    }
    const [year, month] = parts;
    const paymentMethodId = this.paymentMethodId();
    const pocketId = this.pocketId();
    if (paymentMethodId === 0) {
      this.errorMessage.set('Selecciona un método de pago.');
      return;
    }
    if (pocketId === 0) {
      this.errorMessage.set('Selecciona un bolsillo.');
      return;
    }

    const previous = this.expense();
    const updated: Expense = {
      ...(previous ?? {}),
      date,
      description,
      amount,
      category: this.category(),
      paymentMethodId,
      pocketId,
      month,
      year,
      isInstallment: false,
    };
    if (previous?.id !== undefined) {
      updated.id = previous.id;
    }
    this.saved.emit(updated);
  }

  private todayIso(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
