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
    if (type === 'savings') return 'Ahorro';
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
