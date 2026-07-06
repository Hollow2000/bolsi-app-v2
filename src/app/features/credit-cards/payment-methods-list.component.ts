import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import type { PaymentMethod, PaymentMethodType } from '../../core/models/payment-method.model';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { IconButtonDirective } from '../../shared/components/icon-button/icon-button.directive';
import { ListItemComponent } from '../../shared/components/list-item/list-item.component';
import { MexicanCurrencyPipe } from '../../shared/pipes/mexican-currency.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { EditPaymentMethodModalComponent } from './edit-payment-method-modal.component';

@Component({
  selector: 'app-payment-methods-list',
  imports: [
    BottomSheetComponent,
    CardComponent,
    EditPaymentMethodModalComponent,
    IconButtonDirective,
    ListItemComponent,
  ],
  template: `
    <div class="app-screen">
      <header class="app-screen-header">
        <h1>Métodos de pago</h1>
      </header>
      <main class="app-screen-content">
        @if (paymentMethods().length === 0) {
          <app-card title="Sin métodos de pago">
            <p class="empty-message">No tienes métodos de pago registrados todavía.</p>
          </app-card>
        } @else {
          <ul class="app-list" aria-label="Métodos de pago">
            @for (method of paymentMethods(); track method.id) {
              <li class="app-list-item">
                <app-list-item
                  [icon]="iconFor(method.type)"
                  [title]="method.name"
                  [subtitle]="subtitleFor(method)"
                />
                <button
                  appIconButton
                  type="button"
                  aria-label="Editar método de pago"
                  (click)="openEdit(method)"
                >
                  <span class="material-symbols-outlined icon icon--small" aria-hidden="true">edit</span>
                </button>
                <button
                  appIconButton
                  type="button"
                  aria-label="Eliminar método de pago"
                  (click)="confirmDelete(method)"
                >
                  <span class="material-symbols-outlined icon icon--small" aria-hidden="true">delete</span>
                </button>
              </li>
            }
          </ul>
        }
      </main>
    </div>

    @if (editing(); as method) {
      <app-bottom-sheet title="Editar método de pago" (close)="closeEdit()">
        <app-edit-payment-method-modal
          [paymentMethod]="method"
          (cancel)="closeEdit()"
          (saved)="onSaved($event)"
        />
      </app-bottom-sheet>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .empty-message {
        margin: 0;
        color: var(--text-secondary);
        text-align: center;
        padding: var(--space-4) 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentMethodsListComponent {
  private readonly service = inject(PaymentMethodService);
  private readonly toast = inject(ToastService);
  private readonly currency = inject(MexicanCurrencyPipe);
  private readonly router = inject(Router);

  protected readonly paymentMethods = signal<PaymentMethod[]>([]);
  protected readonly editing = signal<PaymentMethod | null>(null);

  protected readonly creditCards = computed(() =>
    this.paymentMethods().filter((method) => method.type === 'credit'),
  );

  constructor() {
    void this.load();
  }

  protected openDetail(method: PaymentMethod): void {
    if (method.id !== undefined) {
      void this.router.navigate(['/credit-cards', method.id]);
    }
  }

  protected iconFor(type: PaymentMethodType): string {
    if (type === 'cash') return 'payments';
    if (type === 'debit') return 'account_balance';
    return 'credit_card';
  }

  protected subtitleFor(method: PaymentMethod): string {
    if (method.type === 'credit') {
      return `Crédito · Límite ${this.currency.transform(method.creditLimit ?? 0)}`;
    }
    return `Saldo ${this.currency.transform(method.currentBalance ?? 0)}`;
  }

  protected openEdit(method: PaymentMethod): void {
    this.editing.set(method);
  }

  protected closeEdit(): void {
    this.editing.set(null);
  }

  protected async onSaved(updated: PaymentMethod): Promise<void> {
    try {
      await this.service.update(updated);
      this.editing.set(null);
      await this.load();
      this.toast.show('Método de pago actualizado.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el método de pago.';
      this.toast.show(message);
    }
  }

  protected async confirmDelete(method: PaymentMethod): Promise<void> {
    const confirmed = window.confirm(
      `¿Eliminar el método de pago "${method.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed || method.id === undefined) {
      return;
    }
    try {
      await this.service.delete(method.id);
      this.toast.show('Método de pago eliminado.');
      await this.load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el método de pago.';
      this.toast.show(message);
    }
  }

  private async load(): Promise<void> {
    this.paymentMethods.set(await this.service.getAll());
  }
}
