import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import type { PaymentMethod } from '../../../core/models/payment-method.model';
import type { SavingsAccount } from '../../../core/models/savings-account.model';
import { SavingsService } from '../../../core/services/savings.service';
import { ButtonDirective } from '../button/button.directive';
import { MexicanCurrencyPipe } from '../../pipes/mexican-currency.pipe';
import { NumberInputComponent } from '../number-input/number-input.component';
import { SegmentedControlComponent, type SegmentedOption } from '../segmented-control/segmented-control.component';
import { SelectInputComponent } from '../select-input/select-input.component';
import { TextInputComponent } from '../text-input/text-input.component';
import { ToastService } from '../../services/toast.service';

type TransactionType = 'deposit' | 'withdrawal';

const TRANSACTION_TYPE_OPTIONS: readonly SegmentedOption<TransactionType>[] = [
  { value: 'deposit', label: 'Depósito' },
  { value: 'withdrawal', label: 'Retiro' },
];

@Component({
  selector: 'app-quick-savings-form',
  imports: [
    ButtonDirective,
    MexicanCurrencyPipe,
    NumberInputComponent,
    SegmentedControlComponent,
    SelectInputComponent,
    TextInputComponent,
  ],
  template: `
    <div class="quick-savings-form">
      <app-segmented-control
        ariaLabel="Tipo de transacción"
        [options]="transactionTypeOptions"
        [value]="transactionType()"
        (valueChange)="transactionType.set($event)"
      />

      <app-select-input
        label="Cuenta de ahorro"
        [valueType]="'number'"
        [value]="savingsAccountId()"
        (valueChange)="onSavingsAccountChange($event)"
      >
        <option value="0" disabled [selected]="savingsAccountId() === 0">Seleccionar cuenta</option>
        @for (account of savingsAccounts(); track account.id) {
          <option [value]="account.id!" [selected]="savingsAccountId() === account.id">
            {{ account.name }}
          </option>
        }
      </app-select-input>

      @if (transactionType() === 'deposit') {
        <app-select-input
          label="Cuenta de origen"
          [valueType]="'number'"
          [value]="originPaymentMethodId()"
          (valueChange)="onOriginMethodChange($event)"
        >
          <option value="0" disabled [selected]="originPaymentMethodId() === 0">Seleccionar cuenta</option>
          @for (method of originMethods(); track method.id) {
            <option [value]="method.id!" [selected]="originPaymentMethodId() === method.id">
              {{ method.name }} ({{ typeLabel(method.type) }})
            </option>
          }
        </app-select-input>
        @if (originBalance() !== null) {
          <p class="balance-info">Disponible: <strong>{{ originBalance() | mexicanCurrency }}</strong></p>
        }
      } @else {
        <app-select-input
          label="Cuenta de destino"
          [valueType]="'number'"
          [value]="destinationPaymentMethodId()"
          (valueChange)="onDestinationMethodChange($event)"
        >
          <option value="0" disabled [selected]="destinationPaymentMethodId() === 0">Seleccionar cuenta</option>
          @for (method of destinationMethods(); track method.id) {
            <option [value]="method.id!" [selected]="destinationPaymentMethodId() === method.id">
              {{ method.name }} ({{ typeLabel(method.type) }})
            </option>
          }
        </app-select-input>
        @if (selectedSavingsBalance() !== null) {
          <p class="balance-info">Disponible en ahorro: <strong>{{ selectedSavingsBalance() | mexicanCurrency }}</strong></p>
        }
      }

      <app-number-input
        label="Monto"
        [value]="amount()"
        (valueChange)="amount.set($event)"
      />

      <app-text-input
        label="Descripción (opcional)"
        [value]="description()"
        (valueChange)="description.set($event)"
      />

      @if (errorMessage()) {
        <p class="form-error" role="alert">{{ errorMessage() }}</p>
      }

      <button
        appButton
        type="button"
        class="form-submit"
        (click)="save()"
      >
        Registrar {{ transactionType() === 'deposit' ? 'depósito' : 'retiro' }}
      </button>
    </div>
  `,
  styles: `
    .quick-savings-form {
      padding: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .form-error {
      margin: 0;
      color: var(--color-danger);
      font-size: var(--text-size-small);
      text-align: center;
    }
    .form-submit { width: 100%; }
    .balance-info {
      margin: 0;
      font-size: var(--text-size-small);
      color: var(--text-secondary);
      padding: var(--space-2) var(--space-3);
      background: var(--surface-alt);
      border-radius: var(--radius-md);
    }
    .balance-info strong {
      color: var(--text-primary);
      font-family: var(--font-mono);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickSavingsFormComponent {
  private readonly savingsService = inject(SavingsService);
  private readonly toast = inject(ToastService);

  readonly paymentMethods = input.required<readonly PaymentMethod[]>();
  readonly savingsAccounts = input.required<readonly SavingsAccount[]>();
  readonly cancel = output<void>();
  readonly saved = output<void>();

  protected readonly transactionTypeOptions = TRANSACTION_TYPE_OPTIONS;
  protected readonly transactionType = signal<TransactionType>('deposit');
  protected readonly savingsAccountId = signal<number>(0);
  protected readonly originPaymentMethodId = signal<number>(0);
  protected readonly destinationPaymentMethodId = signal<number>(0);
  protected readonly amount = signal(0);
  protected readonly description = signal('');
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly originMethods = computed(() =>
    this.paymentMethods().filter((m) => m.type === 'cash' || m.type === 'debit'),
  );

  protected readonly destinationMethods = computed(() =>
    this.paymentMethods().filter((m) => m.type === 'cash' || m.type === 'debit'),
  );

  protected readonly originBalance = computed(() => {
    const id = this.originPaymentMethodId();
    if (id === 0) return null;
    const method = this.paymentMethods().find((m) => m.id === id);
    return method?.currentBalance ?? 0;
  });

  protected readonly selectedSavingsBalance = computed(() => {
    const id = this.savingsAccountId();
    if (id === 0) return null;
    const account = this.savingsAccounts().find((a) => a.id === id);
    return account?.balance ?? 0;
  });

  protected onSavingsAccountChange(value: number | string | null): void {
    this.savingsAccountId.set(typeof value === 'number' ? value : 0);
  }

  protected onOriginMethodChange(value: number | string | null): void {
    this.originPaymentMethodId.set(typeof value === 'number' ? value : 0);
  }

  protected onDestinationMethodChange(value: number | string | null): void {
    this.destinationPaymentMethodId.set(typeof value === 'number' ? value : 0);
  }

  protected typeLabel(type: PaymentMethod['type']): string {
    if (type === 'cash') return 'Efectivo';
    if (type === 'debit') return 'Débito';
    return 'Crédito';
  }

  protected async save(): Promise<void> {
    this.errorMessage.set(null);
    const type = this.transactionType();
    const savingsId = this.savingsAccountId();
    const amount = this.amount();

    if (savingsId === 0) {
      this.errorMessage.set('Selecciona una cuenta de ahorro.');
      return;
    }

    if (amount <= 0) {
      this.errorMessage.set('El monto debe ser mayor a 0.');
      return;
    }

    if (type === 'deposit') {
      const originId = this.originPaymentMethodId();
      if (originId === 0) {
        this.errorMessage.set('Selecciona una cuenta de origen.');
        return;
      }
      const originBalance = this.originBalance() ?? 0;
      if (amount > originBalance) {
        this.errorMessage.set('El monto excede el saldo disponible de la cuenta de origen.');
        return;
      }
    } else {
      const destId = this.destinationPaymentMethodId();
      if (destId === 0) {
        this.errorMessage.set('Selecciona una cuenta de destino.');
        return;
      }
      const account = this.savingsAccounts().find((a) => a.id === savingsId);
      if (account && amount > account.balance) {
        this.errorMessage.set('El monto excede el saldo disponible.');
        return;
      }
    }

    try {
      if (type === 'deposit') {
        await this.savingsService.deposit(savingsId, amount, this.originPaymentMethodId(), this.description().trim() || undefined);
        this.toast.show('Depósito registrado.');
      } else {
        await this.savingsService.withdraw(savingsId, amount, this.destinationPaymentMethodId(), this.description().trim() || undefined);
        this.toast.show('Retiro registrado.');
      }
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudo registrar la transacción.');
    }
  }
}
