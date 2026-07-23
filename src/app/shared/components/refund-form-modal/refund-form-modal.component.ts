import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';

import type { Expense } from '../../../core/models/expense.model';
import type { PaymentMethod } from '../../../core/models/payment-method.model';
import type { Refund } from '../../../core/models/refund.model';
import { ButtonDirective } from '../../components/button/button.directive';
import { DateInputComponent } from '../../components/date-input/date-input.component';
import { NumberInputComponent } from '../../components/number-input/number-input.component';
import { SelectInputComponent } from '../../components/select-input/select-input.component';
import { TextInputComponent } from '../../components/text-input/text-input.component';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-refund-form-modal',
  imports: [
    ButtonDirective,
    DateInputComponent,
    NumberInputComponent,
    SelectInputComponent,
    TextInputComponent,
  ],
  template: `
    <div class="refund-form">
      <p class="refund-form__expense">
        Reembolso de: <strong>{{ expense().description }}</strong>
      </p>

      <app-number-input
        label="Monto"
        [value]="amount()"
        (valueChange)="amount.set($event)"
        placeholder="0.00"
      />

      <app-date-input
        label="Fecha"
        [value]="date()"
        (valueChange)="date.set($event)"
      />

      <app-select-input
        label="Método de destino"
        [valueType]="'number'"
        [value]="refundPaymentMethodId()"
        (valueChange)="refundPaymentMethodId.set($any($event))"
      >
        <option [value]="0" disabled>Seleccionar cuenta</option>
        @for (method of paymentMethods(); track method.id) {
          <option [value]="method.id!" [selected]="refundPaymentMethodId() === method.id">
            {{ method.name }}
          </option>
        }
      </app-select-input>

      <app-text-input
        label="Descripción (opcional)"
        [value]="description()"
        (valueChange)="description.set($event)"
      />

      @if (errorMessage()) {
        <p class="form-error" role="alert">{{ errorMessage() }}</p>
      }

      <div class="modal-actions">
        <button appButton variant="secondary" type="button" (click)="cancel.emit()">Cancelar</button>
        <button appButton variant="primary" type="button" (click)="onSubmit()">Confirmar reembolso</button>
      </div>
    </div>
  `,
  styles: `
    .refund-form {
      padding: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .refund-form__expense {
      margin: 0;
      font-size: var(--text-size-small);
      color: var(--text-secondary);
      padding: var(--space-2);
      background: var(--surface-alt);
      border-radius: var(--radius-md);
    }
    .form-error {
      margin: 0;
      color: var(--color-danger);
      font-size: var(--text-size-small);
      text-align: center;
    }
    .modal-actions {
      display: flex;
      gap: var(--space-2);
      justify-content: flex-end;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RefundFormModalComponent {
  private readonly toast = inject(ToastService);

  readonly expense = input.required<Expense>();
  readonly paymentMethods = input.required<readonly PaymentMethod[]>();
  readonly cancel = output<void>();
  readonly saved = output<Omit<Refund, 'id'>>();

  protected readonly amount = signal(0);
  protected readonly date = signal('');
  protected readonly refundPaymentMethodId = signal(0);
  protected readonly description = signal('');
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const exp = this.expense();
    this.amount.set(exp.amount);
    this.date.set(this.todayIso());
    this.refundPaymentMethodId.set(exp.paymentMethodId);
  }

  protected onSubmit(): void {
    this.errorMessage.set(null);

    const amount = this.amount();
    if (amount <= 0) {
      this.errorMessage.set('El monto debe ser mayor a 0.');
      return;
    }

    const exp = this.expense();
    if (amount > exp.amount) {
      this.errorMessage.set('El monto no puede exceder el monto del gasto original.');
      return;
    }

    const paymentMethodId = this.refundPaymentMethodId();
    if (paymentMethodId === 0) {
      this.errorMessage.set('Selecciona un método de destino.');
      return;
    }

    const dateStr = this.date();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      this.errorMessage.set('La fecha no es válida.');
      return;
    }

    const [year, month] = dateStr.split('-').map(Number);

    this.saved.emit({
      expenseId: exp.id!,
      originalPaymentMethodId: exp.paymentMethodId,
      refundPaymentMethodId: paymentMethodId,
      amount,
      date: dateStr,
      description: this.description().trim() || undefined,
      month,
      year,
    });
  }

  private todayIso(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
