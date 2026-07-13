import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';

import { INCOME_CATEGORIES_DEFAULT } from '../../core/services/catalog.service';
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
  templateUrl: './edit-income-modal.component.html',
  styleUrl: './edit-income-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditIncomeModalComponent implements OnInit {
  readonly income = input<Income | null>(null);
  readonly receivableMethods = input.required<readonly PaymentMethod[]>();
  readonly cancel = output<void>();
  readonly saved = output<Income>();

  protected readonly categories = INCOME_CATEGORIES_DEFAULT;
  protected readonly frequencyOptions = FREQUENCY_OPTIONS;
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly description = signal('');
  protected readonly amount = signal(0);
  protected readonly date = signal('');
  protected readonly paymentMethodId = signal<number>(0);
  protected readonly category = signal<string>(INCOME_CATEGORIES_DEFAULT[0]);
  protected readonly frequency = signal<IncomeFrequency>('monthly');
  protected readonly status = signal<IncomeStatus>('received');

  ngOnInit(): void {
    const initial = this.income();
    if (initial) {
      this.description.set(initial.description);
      this.amount.set(initial.amount);
      this.date.set(initial.date);
      this.paymentMethodId.set(initial.paymentMethodId);
      this.category.set(initial.category);
      this.frequency.set(initial.frequency);
      this.status.set(initial.status);
    } else {
      this.date.set(this.todayIso());
    }
  }

  protected submitLabel(): string {
    return this.income() ? 'Guardar cambios' : 'Agregar ingreso';
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
      ...(previous ?? {}),
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
    if (previous?.id !== undefined) {
      updated.id = previous.id;
    }

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
