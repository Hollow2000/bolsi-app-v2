import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';

import type { PaymentMethod } from '../../core/models/payment-method.model';
import type { Transfer } from '../../core/models/transfer.model';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { DateInputComponent } from '../../shared/components/date-input/date-input.component';
import { NumberInputComponent } from '../../shared/components/number-input/number-input.component';
import { SelectInputComponent } from '../../shared/components/select-input/select-input.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';

@Component({
  selector: 'app-transfer-form-modal',
  imports: [
    ButtonDirective,
    DateInputComponent,
    NumberInputComponent,
    SelectInputComponent,
    TextInputComponent,
  ],
  templateUrl: './transfer-form-modal.component.html',
  styleUrl: './transfer-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferFormModalComponent implements OnInit {
  readonly paymentMethods = input.required<readonly PaymentMethod[]>();
  readonly cancel = output<void>();
  readonly saved = output<Transfer>();

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly description = signal('');
  protected readonly amount = signal(0);
  protected readonly date = signal('');
  protected readonly fromPaymentMethodId = signal<number>(0);
  protected readonly toPaymentMethodId = signal<number>(0);

  ngOnInit(): void {
    this.date.set(this.todayIso());
    const methods = this.paymentMethods();
    if (methods.length >= 2) {
      this.fromPaymentMethodId.set(methods[0].id ?? 0);
      this.toPaymentMethodId.set(methods[1].id ?? 0);
    } else if (methods.length === 1) {
      this.fromPaymentMethodId.set(methods[0].id ?? 0);
    }
  }

  protected typeLabel(type: PaymentMethod['type']): string {
    if (type === 'cash') return 'Efectivo';
    if (type === 'debit') return 'Débito';
    if (type === 'savings') return 'Ahorro';
    return 'Crédito';
  }

  protected onSubmit(): void {
    this.errorMessage.set(null);
    const description = this.description().trim();
    if (!description) {
      this.errorMessage.set('La descripción es obligatoria.');
      return;
    }
    const amount = Math.round(this.amount() * 100) / 100;
    if (amount <= 0) {
      this.errorMessage.set('El monto debe ser mayor a 0.');
      return;
    }
    const fromId = this.fromPaymentMethodId();
    const toId = this.toPaymentMethodId();
    if (fromId === 0 || toId === 0) {
      this.errorMessage.set('Selecciona origen y destino.');
      return;
    }
    if (fromId === toId) {
      this.errorMessage.set('El origen y el destino no pueden ser la misma cuenta.');
      return;
    }
    const date = this.date();
    const parts = date.split('-').map((segment) => Number(segment));
    if (parts.length !== 3 || parts.some((segment) => !Number.isInteger(segment))) {
      this.errorMessage.set('La fecha no es válida.');
      return;
    }
    const [year, month] = parts;
    this.saved.emit({
      fromPaymentMethodId: fromId,
      toPaymentMethodId: toId,
      amount,
      date,
      description,
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
