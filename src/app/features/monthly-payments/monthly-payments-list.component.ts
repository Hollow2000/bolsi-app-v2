import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';

import { INCOME_CATEGORIES } from '../../core/catalogs';
import type { MonthlyPayment } from '../../core/models/monthly-payment.model';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import type { Pocket } from '../../core/models/pocket.model';
import { MonthlyPaymentService } from '../../core/services/monthly-payment.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { PocketService } from '../../core/services/pocket.service';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { FabComponent } from '../../shared/components/fab/fab.component';
import { IconButtonDirective } from '../../shared/components/icon-button/icon-button.directive';
import { ListItemComponent } from '../../shared/components/list-item/list-item.component';
import { NumberInputComponent } from '../../shared/components/number-input/number-input.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';
import { MexicanCurrencyPipe, formatMexicanCurrency } from '../../shared/pipes/mexican-currency.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { MonthlyPaymentFormModalComponent } from './monthly-payment-form-modal.component';

interface PaymentWithUrgency extends MonthlyPayment {
  readonly urgency: 'overdue' | 'soon' | 'this-week' | 'later' | 'paid';
  readonly daysUntilDue: number;
}

@Component({
  selector: 'app-monthly-payments-list',
  imports: [
    BottomSheetComponent,
    CardComponent,
    FabComponent,
    IconButtonDirective,
    ListItemComponent,
    MexicanCurrencyPipe,
    MonthlyPaymentFormModalComponent,
    NumberInputComponent,
    TextInputComponent,
  ],
  template: `
    <div class="app-screen">
      <header class="app-screen-header">
        <h1>Pagos mensuales</h1>
        <span class="screen-period">{{ periodLabel() }}</span>
      </header>
      <main class="app-screen-content">
        <app-card title="Resumen del mes">
          <p class="summary-line">
            <span class="summary-label">Pendientes</span>
            <span class="summary-value">{{ totals().pending | mexicanCurrency }}</span>
          </p>
          <p class="summary-line">
            <span class="summary-label">Pagados</span>
            <span class="summary-value summary-value--success">{{ totals().paid | mexicanCurrency }}</span>
          </p>
        </app-card>

        @if (payments().length === 0) {
          <app-card title="Sin pagos">
            <p class="empty-message">No tienes pagos registrados este mes.</p>
          </app-card>
        } @else {
          <ul class="app-list" aria-label="Pagos del mes">
            @for (payment of payments(); track payment.id) {
              <li class="app-list-row payment-row" [class]="urgencyClass(payment)">
                <app-list-item
                  [icon]="payment.paid ? 'check_circle' : iconFor(payment)"
                  [title]="payment.name"
                  [subtitle]="subtitleFor(payment)"
                  [amount]="(payment.amount | mexicanCurrency) ?? ''"
                  [tone]="payment.paid ? 'income' : 'expense'"
                />
                <div class="item-actions">
                  @if (!payment.paid && payment.id !== undefined) {
                    <button
                      appIconButton
                      type="button"
                      aria-label="Marcar como pagado"
                      (click)="openMarkAsPaid(payment)"
                    >
                      <span class="material-symbols-outlined icon icon--small" aria-hidden="true">check_circle</span>
                    </button>
                  }
                  <button
                    appIconButton
                    type="button"
                    aria-label="Editar pago"
                    (click)="openEdit(payment)"
                  >
                    <span class="material-symbols-outlined icon icon--small" aria-hidden="true">edit</span>
                  </button>
                  <button
                    appIconButton
                    type="button"
                    aria-label="Eliminar pago"
                    (click)="confirmDelete(payment)"
                  >
                    <span class="material-symbols-outlined icon icon--small" aria-hidden="true">delete</span>
                  </button>
                </div>
              </li>
            }
          </ul>
        }
      </main>
      <app-fab icon="add" ariaLabel="Registrar nuevo pago" (press)="openAdd()" />
    </div>

    @if (modalOpen()) {
      <app-bottom-sheet
        [title]="editingPayment() ? 'Editar pago' : 'Nuevo pago'"
        (close)="closeModal()"
      >
        <app-monthly-payment-form-modal
          [payment]="editingPayment()"
          [paymentMethods]="paymentMethods()"
          [pockets]="pockets()"
          [month]="currentMonth()"
          [year]="currentYear()"
          (cancel)="closeModal()"
          (saved)="onSaved($event)"
        />
      </app-bottom-sheet>
    }

    @if (markingAsPaid(); as payment) {
      <app-bottom-sheet title="Marcar como pagado" (close)="closeMarkAsPaid()">
        <app-text-input
          label="Pago"
          [value]="payment.name"
        />
        <app-number-input
          label="Monto a pagar"
          [min]="0"
          [value]="amountToPay()"
          (valueChange)="amountToPay.set($event)"
        />
        @if (markAsPaidError(); as message) {
          <p class="modal-error" role="alert">{{ message }}</p>
        }
        <div class="modal-actions">
          <button appButton variant="secondary" type="button" (click)="closeMarkAsPaid()">
            Cancelar
          </button>
          <button appButton variant="primary" type="button" [disabled]="savingPayment()" (click)="confirmMarkAsPaid()">
            {{ savingPayment() ? 'Guardando…' : 'Confirmar pago' }}
          </button>
        </div>
      </app-bottom-sheet>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .screen-period {
        font-size: var(--text-size-small);
        color: var(--text-secondary);
      }
      .summary-line {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin: 0 0 var(--space-1);
        gap: var(--space-3);
      }
      .summary-line:last-child { margin-bottom: 0; }
      .summary-label {
        font-size: var(--text-size-small);
        color: var(--text-secondary);
      }
      .summary-value {
        font-size: var(--text-size-base);
        font-weight: 600;
        font-family: var(--font-family-mono);
        color: var(--text-primary);
      }
      .summary-value--success { color: var(--color-success); }
      .empty-message {
        margin: 0;
        color: var(--text-secondary);
        text-align: center;
        padding: var(--space-2) 0;
      }
      .payment-row {
        background: var(--surface);
      }
      .payment-row.urgency-overdue {
        background: var(--color-danger-subtle);
      }
      .payment-row.urgency-soon {
        background: var(--color-warning-subtle);
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
export class MonthlyPaymentsListComponent {
  private readonly service = inject(MonthlyPaymentService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly pocketService = inject(PocketService);
  private readonly toast = inject(ToastService);

  protected readonly payments = signal<PaymentWithUrgency[]>([]);
  protected readonly paymentMethods = signal<PaymentMethod[]>([]);
  protected readonly pockets = signal<Pocket[]>([]);
  protected readonly currentMonth = signal(new Date().getMonth() + 1);
  protected readonly currentYear = signal(new Date().getFullYear());
  protected readonly editingPayment = signal<MonthlyPayment | null>(null);
  protected readonly modalOpen = signal(false);

  protected readonly markingAsPaid = signal<MonthlyPayment | null>(null);
  protected readonly amountToPay = signal(0);
  protected readonly savingPayment = signal(false);
  protected readonly markAsPaidError = signal<string | null>(null);

  protected readonly totals = computed(() => {
    const items = this.payments();
    const pending = items
      .filter((payment) => !payment.paid)
      .reduce((sum, payment) => sum + (payment.amount - payment.amountPaid), 0);
    const paid = items
      .filter((payment) => payment.paid)
      .reduce((sum, payment) => sum + payment.amountPaid, 0);
    return { pending, paid };
  });

  protected readonly periodLabel = computed(() => {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    return `${monthNames[this.currentMonth() - 1]} ${this.currentYear()}`;
  });

  constructor() {
    void this.load();
    effect(() => {
      const month = this.currentMonth();
      const year = this.currentYear();
      void this.loadPayments(month, year);
    });
  }

  protected iconFor(payment: PaymentWithUrgency): string {
    if (payment.daysUntilDue < 0) return 'warning';
    if (payment.daysUntilDue <= 3) return 'schedule';
    return 'event';
  }

  protected subtitleFor(payment: PaymentWithUrgency): string {
    const method = this.paymentMethods().find((m) => m.id === payment.paymentMethodId);
    const methodName = method?.name ?? '—';
    if (payment.paid) {
      return `Pagado · ${methodName}`;
    }
    if (payment.daysUntilDue < 0) {
      return `Vencido hace ${Math.abs(payment.daysUntilDue)} día(s) · ${methodName}`;
    }
    if (payment.daysUntilDue === 0) {
      return `Vence hoy · ${methodName}`;
    }
    return `Vence en ${payment.daysUntilDue} día(s) · ${methodName}`;
  }

  protected urgencyClass(payment: PaymentWithUrgency): string {
    return `urgency-${payment.urgency}`;
  }

  protected openAdd(): void {
    this.editingPayment.set(null);
    this.modalOpen.set(true);
  }

  protected openEdit(payment: MonthlyPayment): void {
    this.editingPayment.set(payment);
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.editingPayment.set(null);
    this.modalOpen.set(false);
  }

  protected async onSaved(updated: MonthlyPayment): Promise<void> {
    const editing = this.editingPayment();
    try {
      if (editing) {
        await this.service.update(updated);
        this.toast.show('Pago actualizado.');
      } else {
        await this.service.create(updated);
        this.toast.show('Pago registrado.');
      }
      this.closeModal();
      await this.loadPayments(this.currentMonth(), this.currentYear());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el pago.';
      this.toast.show(message);
    }
  }

  protected openMarkAsPaid(payment: MonthlyPayment): void {
    this.markingAsPaid.set(payment);
    this.amountToPay.set(payment.amount - payment.amountPaid);
    this.markAsPaidError.set(null);
  }

  protected closeMarkAsPaid(): void {
    this.markingAsPaid.set(null);
    this.markAsPaidError.set(null);
  }

  protected async confirmMarkAsPaid(): Promise<void> {
    const payment = this.markingAsPaid();
    if (!payment) {
      return;
    }
    const amount = this.amountToPay();
    if (!Number.isFinite(amount) || amount <= 0) {
      this.markAsPaidError.set('El monto a pagar debe ser mayor a 0.');
      return;
    }
    this.savingPayment.set(true);
    this.markAsPaidError.set(null);
    try {
      await this.service.markAsPaid(payment, amount);
      this.toast.show('Pago registrado. Se creó un gasto automático.');
      this.closeMarkAsPaid();
      await this.loadPayments(this.currentMonth(), this.currentYear());
    } catch (error) {
      this.markAsPaidError.set(error instanceof Error ? error.message : 'No se pudo registrar el pago.');
    } finally {
      this.savingPayment.set(false);
    }
  }

  protected async confirmDelete(payment: MonthlyPayment): Promise<void> {
    const confirmed = window.confirm(
      `¿Eliminar el pago "${payment.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed || payment.id === undefined) {
      return;
    }
    try {
      await this.service.delete(payment.id);
      this.toast.show('Pago eliminado.');
      await this.loadPayments(this.currentMonth(), this.currentYear());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el pago.';
      this.toast.show(message);
    }
  }

  private async load(): Promise<void> {
    const [methods, pockets] = await Promise.all([
      this.paymentMethodService.getAll(),
      this.pocketService.getAll(),
    ]);
    this.paymentMethods.set(methods);
    this.pockets.set(pockets);
    await this.loadPayments(this.currentMonth(), this.currentYear());
  }

  private async loadPayments(month: number, year: number): Promise<void> {
    const items = await this.service.getByMonth(month, year);
    const enriched = items.map((payment) => this.enrich(payment));
    this.payments.set(enriched);
  }

  private enrich(payment: MonthlyPayment): PaymentWithUrgency {
    const daysUntilDue = this.daysUntil(payment.dueDate);
    let urgency: PaymentWithUrgency['urgency'];
    if (payment.paid) {
      urgency = 'paid';
    } else if (daysUntilDue < 0) {
      urgency = 'overdue';
    } else if (daysUntilDue <= 3) {
      urgency = 'soon';
    } else if (daysUntilDue <= 7) {
      urgency = 'this-week';
    } else {
      urgency = 'later';
    }
    return { ...payment, urgency, daysUntilDue };
  }

  private daysUntil(isoDate: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(`${isoDate}T00:00:00`);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }
}
