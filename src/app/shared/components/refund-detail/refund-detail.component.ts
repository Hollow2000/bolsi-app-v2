import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';

import type { Refund } from '../../../core/models/refund.model';
import type { PaymentMethod } from '../../../core/models/payment-method.model';
import { ButtonDirective } from '../../components/button/button.directive';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { MexicanCurrencyPipe } from '../../pipes/mexican-currency.pipe';

@Component({
  selector: 'app-refund-detail',
  imports: [
    ButtonDirective,
    ConfirmDialogComponent,
    MexicanCurrencyPipe,
  ],
  template: `
    <div class="refund-detail">
      <div class="refund-detail__row">
        <span class="refund-detail__label">Monto</span>
        <span class="refund-detail__value">{{ refund().amount | mexicanCurrency }}</span>
      </div>
      <div class="refund-detail__row">
        <span class="refund-detail__label">Fecha</span>
        <span class="refund-detail__value">{{ formatDate(refund().date) }}</span>
      </div>
      <div class="refund-detail__row">
        <span class="refund-detail__label">Destino</span>
        <span class="refund-detail__value">{{ getPaymentMethodName(refund().refundPaymentMethodId) }}</span>
      </div>
      @if (refund().description) {
        <div class="refund-detail__row">
          <span class="refund-detail__label">Descripción</span>
          <span class="refund-detail__value">{{ refund().description }}</span>
        </div>
      }
      <div class="refund-detail__actions">
        <button
          appButton
          variant="secondary"
          type="button"
          class="refund-detail__delete"
          (click)="confirmDelete()"
        >
          <span class="material-symbols-outlined icon icon--small" aria-hidden="true">delete</span>
          Eliminar reembolso
        </button>
      </div>
    </div>

    @if (showConfirm()) {
      <div class="confirm-overlay">
        <div class="confirm-dialog">
          <p class="confirm-dialog__message">
            ¿Eliminar este reembolso? El saldo del método de pago se revertirá y el gasto quedará disponible para reembolso nuevamente.
          </p>
          <div class="confirm-dialog__actions">
            <button appButton variant="secondary" type="button" (click)="cancelDelete()">Cancelar</button>
            <button appButton variant="primary" type="button" (click)="deleteRefund()">Eliminar</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .refund-detail {
      padding: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    .refund-detail__row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .refund-detail__label {
      font-size: var(--text-size-small);
      color: var(--text-secondary);
    }
    .refund-detail__value {
      font-size: var(--text-size-base);
      font-weight: 500;
      color: var(--text-primary);
      font-family: var(--font-mono);
    }
    .refund-detail__actions {
      margin-top: var(--space-2);
    }
    .refund-detail__delete {
      width: 100%;
      color: var(--color-danger);
    }
    .confirm-overlay {
      position: fixed;
      inset: 0;
      background: var(--background-overlay);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 200;
    }
    .confirm-dialog {
      background: var(--surface);
      border-radius: var(--radius-lg);
      padding: var(--space-4);
      max-width: 320px;
      width: 90%;
    }
    .confirm-dialog__message {
      margin: 0 0 var(--space-4);
      font-size: var(--text-size-base);
      color: var(--text-primary);
    }
    .confirm-dialog__actions {
      display: flex;
      gap: var(--space-2);
      justify-content: flex-end;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RefundDetailComponent {
  readonly refund = input.required<Refund>();
  readonly paymentMethods = input.required<readonly PaymentMethod[]>();
  readonly deleteConfirmed = output<void>();
  readonly cancel = output<void>();

  protected readonly showConfirm = signal(false);

  protected formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }

  protected getPaymentMethodName(id: number): string {
    return this.paymentMethods().find((m) => m.id === id)?.name ?? '—';
  }

  protected confirmDelete(): void {
    this.showConfirm.set(true);
  }

  protected cancelDelete(): void {
    this.showConfirm.set(false);
  }

  protected deleteRefund(): void {
    this.showConfirm.set(false);
    this.deleteConfirmed.emit();
  }
}
