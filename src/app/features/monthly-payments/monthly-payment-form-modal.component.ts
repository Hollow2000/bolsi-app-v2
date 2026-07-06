import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';

import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../../core/catalogs';
import type { MonthlyPayment } from '../../core/models/monthly-payment.model';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import type { Pocket } from '../../core/models/pocket.model';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { DateInputComponent } from '../../shared/components/date-input/date-input.component';
import { NumberInputComponent } from '../../shared/components/number-input/number-input.component';
import { SelectInputComponent } from '../../shared/components/select-input/select-input.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';

/**
 * Form for adding or editing a monthly payment. Pure presentational:
 * the parent owns persistence. If `payment` is provided, the form
 * starts pre-filled for editing; otherwise it starts empty for
 * adding.
 */
@Component({
  selector: 'app-monthly-payment-form-modal',
  imports: [
    ButtonDirective,
    DateInputComponent,
    NumberInputComponent,
    SelectInputComponent,
    TextInputComponent,
  ],
  template: `
    <app-text-input
      label="Nombre"
      [value]="name()"
      (valueChange)="name.set($event)"
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
        label="Vencimiento"
        [value]="dueDate()"
        (valueChange)="dueDate.set($event)"
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
      label="Bolsillo (opcional)"
      [valueType]="'number'"
      [value]="pocketId()"
      (valueChange)="pocketId.set($any($event))"
    >
      <option [value]="0" [selected]="pocketId() === 0">Sin bolsillo</option>
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

    <label class="recurring-toggle">
      <input
        type="checkbox"
        [checked]="isRecurring()"
        (change)="onRecurringToggle($event)"
      />
      <span>Se repite cada mes</span>
    </label>

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
      .recurring-toggle {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--text-size-base);
        font-weight: 500;
        color: var(--text-primary);
        cursor: pointer;
      }
      .recurring-toggle input {
        width: 18px;
        height: 18px;
        cursor: pointer;
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
export class MonthlyPaymentFormModalComponent implements OnInit {
  readonly paymentMethods = input.required<readonly PaymentMethod[]>();
  readonly pockets = input.required<readonly Pocket[]>();
  readonly payment = input<MonthlyPayment | null>(null);
  readonly month = input.required<number>();
  readonly year = input.required<number>();
  readonly cancel = output<void>();
  readonly saved = output<MonthlyPayment>();

  protected readonly categories = EXPENSE_CATEGORIES;
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly name = signal('');
  protected readonly amount = signal(0);
  protected readonly dueDate = signal('');
  protected readonly paymentMethodId = signal<number>(0);
  protected readonly pocketId = signal<number>(0);
  protected readonly category = signal<ExpenseCategory>(EXPENSE_CATEGORIES[0]);
  protected readonly isRecurring = signal(true);

  protected readonly submitLabel = computed(() => (this.payment() ? 'Guardar cambios' : 'Agregar pago'));

  ngOnInit(): void {
    const initial = this.payment();
    if (initial) {
      this.name.set(initial.name);
      this.amount.set(initial.amount);
      this.dueDate.set(initial.dueDate);
      this.paymentMethodId.set(initial.paymentMethodId ?? 0);
      this.pocketId.set(initial.pocketId ?? 0);
      this.category.set((initial.expenseCategory as ExpenseCategory) ?? EXPENSE_CATEGORIES[0]);
      this.isRecurring.set(initial.isRecurring);
    } else {
      this.dueDate.set(this.defaultDueDate());
    }
  }

  protected typeLabel(type: PaymentMethod['type']): string {
    if (type === 'cash') return 'Efectivo';
    if (type === 'debit') return 'Débito';
    return 'Crédito';
  }

  protected onRecurringToggle(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.isRecurring.set(input.checked);
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  protected onSave(): void {
    this.errorMessage.set(null);
    const name = this.name().trim();
    if (!name) {
      this.errorMessage.set('El nombre es obligatorio.');
      return;
    }
    const amount = this.round(this.amount());
    if (amount <= 0) {
      this.errorMessage.set('El monto debe ser mayor a 0.');
      return;
    }
    const dueDate = this.dueDate();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      this.errorMessage.set('La fecha de vencimiento no es válida.');
      return;
    }
    const paymentMethodId = this.paymentMethodId();
    if (paymentMethodId === 0) {
      this.errorMessage.set('Selecciona un método de pago.');
      return;
    }
    const initial = this.payment();
    const updated: MonthlyPayment = {
      ...(initial ?? {}),
      name,
      amount,
      paid: initial?.paid ?? false,
      amountPaid: initial?.amountPaid ?? 0,
      dueDate,
      paymentMethodId,
      pocketId: this.pocketId() === 0 ? undefined : this.pocketId(),
      expenseCategory: this.category(),
      priority: initial?.priority ?? 0,
      isRecurring: this.isRecurring(),
      month: this.month(),
      year: this.year(),
    };
    if (initial?.id !== undefined) {
      updated.id = initial.id;
    }
    this.saved.emit(updated);
  }

  private defaultDueDate(): string {
    return this.todayIso();
  }

  private todayIso(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
