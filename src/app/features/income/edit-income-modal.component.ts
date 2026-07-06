import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';

import { INCOME_CATEGORIES } from '../../core/catalogs';
import type { Income, IncomeFrequency, IncomeStatus } from '../../core/models/income.model';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import { assertCanReceiveIncome, validateIncomeFields } from '../../core/validations/income.validation';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { DateInputComponent } from '../../shared/components/date-input/date-input.component';
import { NumberInputComponent } from '../../shared/components/number-input/number-input.component';
import { SegmentedControlComponent, type SegmentedOption } from '../../shared/components/segmented-control/segmented-control.component';
import { SelectInputComponent } from '../../shared/components/select-input/select-input.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';

const FREQUENCY_OPTIONS: readonly SegmentedOption<IncomeFrequency>[] = [
  { value: 'one-time', label: 'Única' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'biweekly', label: 'Quincenal' },
];

const STATUS_OPTIONS: readonly SegmentedOption<IncomeStatus>[] = [
  { value: 'received', label: 'Recibido' },
  { value: 'expected', label: 'Esperado' },
];

/**
 * Form for editing an income. Pure presentational: the parent owns
 * persistence. Validates with the same pure functions the service
 * uses, so the parent never receives an invalid record.
 */
@Component({
  selector: 'app-edit-income-modal',
  imports: [
    ButtonDirective,
    DateInputComponent,
    NumberInputComponent,
    SegmentedControlComponent,
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
      @for (method of receivableMethods(); track method.id) {
        <option
          [value]="method.id"
          [selected]="method.id === paymentMethodId()"
        >
          {{ method.name }} ({{ method.type === 'cash' ? 'Efectivo' : 'Débito' }})
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

    <app-segmented-control
      ariaLabel="Frecuencia del ingreso"
      [options]="frequencyOptions"
      [value]="frequency()"
      (valueChange)="frequency.set($event)"
    />

    <app-segmented-control
      ariaLabel="Estatus del ingreso"
      [options]="statusOptions"
      [value]="status()"
      (valueChange)="status.set($event)"
    />

    @if (errorMessage(); as message) {
      <p class="modal-error" role="alert">{{ message }}</p>
    }

    <div class="modal-actions">
      <button appButton variant="secondary" type="button" (click)="onCancel()">
        Cancelar
      </button>
      <button appButton variant="primary" type="button" (click)="onSave()">
        Guardar cambios
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
export class EditIncomeModalComponent implements OnInit {
  readonly income = input.required<Income>();
  readonly receivableMethods = input.required<readonly PaymentMethod[]>();
  readonly cancel = output<void>();
  readonly saved = output<Income>();

  protected readonly categories = INCOME_CATEGORIES;
  protected readonly frequencyOptions = FREQUENCY_OPTIONS;
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly description = signal('');
  protected readonly amount = signal(0);
  protected readonly date = signal('');
  protected readonly paymentMethodId = signal<number>(0);
  protected readonly category = signal<string>(INCOME_CATEGORIES[0]);
  protected readonly frequency = signal<IncomeFrequency>('monthly');
  protected readonly status = signal<IncomeStatus>('received');

  ngOnInit(): void {
    const initial = this.income();
    this.description.set(initial.description);
    this.amount.set(initial.amount);
    this.date.set(initial.date);
    this.paymentMethodId.set(initial.paymentMethodId);
    this.category.set(initial.category);
    this.frequency.set(initial.frequency);
    this.status.set(initial.status);
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  protected onSave(): void {
    this.errorMessage.set(null);
    const previous = this.income();
    const date = this.date();
    const parts = date.split('-').map((segment) => Number(segment));
    if (parts.length !== 3 || parts.some((segment) => !Number.isInteger(segment))) {
      this.errorMessage.set('La fecha no es válida.');
      return;
    }
    const [year, month] = parts;
    const updated: Income = {
      ...previous,
      description: this.description().trim(),
      amount: this.round(this.amount()),
      date,
      paymentMethodId: this.paymentMethodId(),
      category: this.category(),
      frequency: this.frequency(),
      status: this.status(),
      month,
      year,
    };

    try {
      validateIncomeFields(updated);
      const method = this.receivableMethods().find((entry) => entry.id === updated.paymentMethodId);
      assertCanReceiveIncome(method);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Datos inválidos.');
      return;
    }
    this.saved.emit(updated);
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
