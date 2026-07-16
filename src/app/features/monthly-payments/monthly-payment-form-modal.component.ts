import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';

import { EXPENSE_CATEGORIES_DEFAULT, MATERIAL_ICONS, type ExpenseCategory } from '../../core/services/catalog.service';
import type { MonthlyPayment, PaymentFrequency } from '../../core/models/monthly-payment.model';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import type { Pocket } from '../../core/models/pocket.model';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { DateInputComponent } from '../../shared/components/date-input/date-input.component';
import { IconPickerComponent } from '../../shared/components/icon-picker/icon-picker.component';
import { NumberInputComponent } from '../../shared/components/number-input/number-input.component';
import { SegmentedControlComponent, type SegmentedOption } from '../../shared/components/segmented-control/segmented-control.component';
import { SelectInputComponent } from '../../shared/components/select-input/select-input.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';

const FREQUENCY_OPTIONS: readonly SegmentedOption<PaymentFrequency>[] = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'weekly', label: 'Semanal' },
];

@Component({
  selector: 'app-monthly-payment-form-modal',
  imports: [
    ButtonDirective,
    DateInputComponent,
    IconPickerComponent,
    NumberInputComponent,
    SegmentedControlComponent,
    SelectInputComponent,
    TextInputComponent,
  ],
  templateUrl: './monthly-payment-form-modal.component.html',
  styleUrl: './monthly-payment-form-modal.component.scss',
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

  protected readonly icons = MATERIAL_ICONS;
  protected readonly categories = EXPENSE_CATEGORIES_DEFAULT;
  protected readonly frequencyOptions = FREQUENCY_OPTIONS;
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly name = signal('');
  protected readonly amount = signal(0);
  protected readonly dueDate = signal('');
  protected readonly paymentMethodId = signal<number>(0);
  protected readonly pocketId = signal<number>(0);
  protected readonly category = signal<ExpenseCategory>(EXPENSE_CATEGORIES_DEFAULT[0]);
  protected readonly isRecurring = signal(true);
  protected readonly frequency = signal<PaymentFrequency>('monthly');
  protected readonly icon = signal('event');

  protected readonly submitLabel = computed(() => (this.payment() ? 'Guardar cambios' : 'Agregar pago'));

  ngOnInit(): void {
    const initial = this.payment();
    if (initial) {
      this.name.set(initial.name);
      this.amount.set(initial.amount);
      this.dueDate.set(initial.dueDate);
      this.paymentMethodId.set(initial.paymentMethodId ?? 0);
      this.pocketId.set(initial.pocketId ?? 0);
      this.category.set((initial.expenseCategory as ExpenseCategory) ?? EXPENSE_CATEGORIES_DEFAULT[0]);
      this.isRecurring.set(initial.isRecurring);
      this.frequency.set(initial.frequency ?? 'monthly');
      this.icon.set(initial.icon ?? 'event');
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
      frequency: this.isRecurring() ? this.frequency() : undefined,
      month: this.month(),
      year: this.year(),
      icon: this.icon(),
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
