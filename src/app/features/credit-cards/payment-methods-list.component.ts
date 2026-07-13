import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import type { PaymentMethod, PaymentMethodType } from '../../core/models/payment-method.model';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EditPaymentMethodModalComponent } from './edit-payment-method-modal.component';
import { FabComponent } from '../../shared/components/fab/fab.component';
import { IconButtonDirective } from '../../shared/components/icon-button/icon-button.directive';
import { ListItemComponent } from '../../shared/components/list-item/list-item.component';
import { MexicanCurrencyPipe, formatMexicanCurrency } from '../../shared/pipes/mexican-currency.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { InstallPromptComponent } from '../../shared/components/install-prompt/install-prompt.component';

interface MethodGroup {
  readonly type: PaymentMethodType;
  readonly label: string;
  readonly icon: string;
  readonly methods: PaymentMethod[];
  readonly totalBalance: number;
  readonly usedThisMonth: number;
  readonly toPay: number;
}

@Component({
  selector: 'app-payment-methods-list',
  imports: [
    BottomSheetComponent,
    CardComponent,
    ConfirmDialogComponent,
    EditPaymentMethodModalComponent,
    FabComponent,
    IconButtonDirective,
    ListItemComponent,
    MexicanCurrencyPipe,
    RouterLink,
    InstallPromptComponent,
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
  protected readonly confirmOpen = signal(false);
  protected readonly confirmMessage = signal('');
  protected readonly confirmAction = signal<(() => void) | null>(null);
  protected readonly collapsedGroups = signal<Set<PaymentMethodType>>(new Set());

  protected readonly methodGroups = computed<MethodGroup[]>(() => {
    const methods = this.paymentMethods();
    const groups: { type: PaymentMethodType; label: string; icon: string }[] = [
      { type: 'cash', label: 'Efectivo', icon: 'payments' },
      { type: 'debit', label: 'Débito', icon: 'account_balance' },
      { type: 'credit', label: 'Crédito', icon: 'credit_card' },
    ];
    return groups
      .map((g) => {
        const filtered = methods.filter((m) => m.type === g.type);
        return {
          ...g,
          methods: filtered,
          totalBalance: this.sumBalance(filtered, g.type),
          usedThisMonth: this.sumCreditUsed(filtered),
          toPay: this.sumCreditToPay(filtered),
        };
      })
      .filter((g) => g.methods.length > 0);
  });

  constructor() {
    void this.load();
  }

  protected toggleGroup(type: PaymentMethodType): void {
    this.collapsedGroups.update((set) => {
      const next = new Set(set);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  protected isGroupCollapsed(type: PaymentMethodType): boolean {
    return this.collapsedGroups().has(type);
  }

  protected groupTotalLabel(group: MethodGroup): string {
    if (group.type === 'credit') {
      return '';
    }
    return `Disponible: ${formatMexicanCurrency(group.totalBalance)}`;
  }

  protected detailRoute(method: PaymentMethod): string[] {
    if (method.type === 'credit') {
      return ['/credit-cards', String(method.id)];
    }
    return ['/payment-methods', String(method.id)];
  }

  protected subtitleFor(method: PaymentMethod): string {
    if (method.type === 'credit') {
      const toPay = method.statementBalance ?? 0;
      return `Límite ${formatMexicanCurrency(method.creditLimit ?? 0)} · A pagar ${formatMexicanCurrency(toPay)}`;
    }
    return `Saldo ${formatMexicanCurrency(method.currentBalance ?? 0)}`;
  }

  protected openAdd(): void {
    this.editing.set({
      type: 'cash',
      name: '',
      currentBalance: 0,
    });
  }

  protected openEdit(method: PaymentMethod): void {
    this.editing.set(method);
  }

  protected closeEdit(): void {
    this.editing.set(null);
  }

  protected async onSaved(updated: PaymentMethod): Promise<void> {
    const isCreating = updated.id === undefined;
    try {
      if (isCreating) {
        await this.service.create(updated);
        this.toast.show('Método de pago creado.');
      } else {
        await this.service.update(updated);
        this.toast.show('Método de pago actualizado.');
      }
      this.closeEdit();
      await this.load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el método de pago.';
      this.toast.show(message);
    }
  }

  protected confirmDelete(method: PaymentMethod): void {
    this.confirmMessage.set(`¿Eliminar el método de pago "${method.name}"? Esta acción no se puede deshacer.`);
    this.confirmAction.set(() => {
      if (method.id === undefined) return;
      void (async () => {
        try {
          await this.service.delete(method.id!);
          this.toast.show('Método de pago eliminado.');
          await this.load();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'No se pudo eliminar el método de pago.';
          this.toast.show(message);
        }
      })();
    });
    this.confirmOpen.set(true);
  }

  protected onConfirm(): void {
    this.confirmAction()?.();
    this.confirmOpen.set(false);
    this.confirmAction.set(null);
  }

  protected onCancelConfirm(): void {
    this.confirmOpen.set(false);
    this.confirmAction.set(null);
  }

  private sumBalance(methods: PaymentMethod[], type: PaymentMethodType): number {
    if (type === 'credit') {
      return methods.reduce((sum, m) => sum + (m.statementBalance ?? 0), 0);
    }
    return methods.reduce((sum, m) => sum + (m.currentBalance ?? 0), 0);
  }

  private sumCreditUsed(methods: PaymentMethod[]): number {
    return Math.round(
      methods.reduce((sum, m) => {
        const used = (m.creditLimit ?? 0) - (m.availableCredit ?? 0);
        return sum + Math.max(0, used);
      }, 0) * 100,
    ) / 100;
  }

  private sumCreditToPay(methods: PaymentMethod[]): number {
    return Math.round(
      methods.reduce((sum, m) => sum + (m.statementBalance ?? 0), 0) * 100,
    ) / 100;
  }

  private async load(): Promise<void> {
    this.paymentMethods.set(await this.service.getAll());
  }
}
