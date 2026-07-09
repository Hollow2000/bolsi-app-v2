import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import type { PaymentMethod, PaymentMethodType } from '../../core/models/payment-method.model';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { IconButtonDirective } from '../../shared/components/icon-button/icon-button.directive';
import { ListItemComponent } from '../../shared/components/list-item/list-item.component';
import { formatMexicanCurrency } from '../../shared/pipes/mexican-currency.pipe';
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
    RouterLink,
  ],
  templateUrl: './payment-methods-list.component.html',
  styleUrl: './payment-methods-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentMethodsListComponent {
  private readonly service = inject(PaymentMethodService);
  private readonly toast = inject(ToastService);
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

  protected detailRoute(method: PaymentMethod): string[] {
    if (method.type === 'credit') {
      return ['/credit-cards', String(method.id)];
    }
    return ['/payment-methods', String(method.id)];
  }

  protected iconFor(type: PaymentMethodType): string {
    if (type === 'cash') return 'payments';
    if (type === 'debit') return 'account_balance';
    return 'credit_card';
  }

  protected subtitleFor(method: PaymentMethod): string {
    if (method.type === 'credit') {
      return `Crédito · Límite ${formatMexicanCurrency(method.creditLimit ?? 0)}`;
    }
    return `Saldo ${formatMexicanCurrency(method.currentBalance ?? 0)}`;
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
