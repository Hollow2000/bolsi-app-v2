import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import type { ScheduledSaving } from '../../core/models/scheduled-saving.model';
import type { SavingsAccount } from '../../core/models/savings-account.model';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import { ScheduledSavingService } from '../../core/services/scheduled-saving.service';
import { SavingsService } from '../../core/services/savings.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { FabComponent } from '../../shared/components/fab/fab.component';
import { IconButtonDirective } from '../../shared/components/icon-button/icon-button.directive';
import { ListItemComponent } from '../../shared/components/list-item/list-item.component';
import { MexicanCurrencyPipe } from '../../shared/pipes/mexican-currency.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { ScheduledSavingFormModalComponent } from './scheduled-saving-form-modal.component';
import { InstallPromptComponent } from '../../shared/components/install-prompt/install-prompt.component';

@Component({
  selector: 'app-scheduled-savings-list',
  imports: [
    BottomSheetComponent,
    CardComponent,
    ConfirmDialogComponent,
    FabComponent,
    IconButtonDirective,
    ListItemComponent,
    MexicanCurrencyPipe,
    ScheduledSavingFormModalComponent,
    InstallPromptComponent,
  ],
  template: `
    <div class="app-screen">
      <header class="app-screen-header">
        <h1>Ahorros programados</h1>
      </header>
      <app-install-prompt />
      <main class="app-screen-content">
        @if (savings().length === 0) {
          <app-card title="Sin ahorros programados">
            <p class="empty-message">No tienes ahorros programados configurados.</p>
          </app-card>
        } @else {
          <ul class="app-list" aria-label="Ahorros programados">
            @for (saving of savings(); track saving.id) {
              <li class="list-item">
                <span class="material-symbols-outlined icon list-item__icon" aria-hidden="true">{{ saving.icon || 'savings' }}</span>
                <div class="list-item__content">
                  <span class="list-item__title">{{ saving.name }}</span>
                  <span class="list-item__subtitle">
                    {{ frequencyLabel(saving.frequency) }} · {{ saving.amount | mexicanCurrency }}
                    @if (savingSavingsAccountName(saving); as name) {
                      · → {{ name }}
                    }
                  </span>
                </div>
                <div class="list-item__actions">
                  <button
                    class="icon-button"
                    type="button"
                    [attr.aria-label]="saving.isActive ? 'Desactivar' : 'Activar'"
                    (click)="toggleActive(saving)"
                  >
                    <span class="material-symbols-outlined icon" [class.icon--active]="saving.isActive" aria-hidden="true">
                      {{ saving.isActive ? 'toggle_on' : 'toggle_off' }}
                    </span>
                  </button>
                  <button
                    class="icon-button"
                    type="button"
                    aria-label="Editar"
                    (click)="openEdit(saving)"
                  >
                    <span class="material-symbols-outlined icon" aria-hidden="true">edit</span>
                  </button>
                  <button
                    class="icon-button"
                    type="button"
                    aria-label="Eliminar"
                    (click)="confirmDelete(saving)"
                  >
                    <span class="material-symbols-outlined icon" aria-hidden="true">delete</span>
                  </button>
                </div>
              </li>
            }
          </ul>
          <app-card title="Resumen del mes">
            <p class="summary-line">
              <span class="summary-label">Total mensual estimado</span>
              <span class="summary-value">{{ totalMonthly() | mexicanCurrency }}</span>
            </p>
          </app-card>
        }
      </main>
      <app-fab icon="add" ariaLabel="Agregar ahorro programado" (press)="openAdd()" />
    </div>

    @if (modalOpen()) {
      <app-bottom-sheet
        [title]="editingSaving() ? 'Editar ahorro programado' : 'Nuevo ahorro programado'"
        (close)="closeModal()"
      >
        <app-scheduled-saving-form-modal
          [saving]="editingSaving()"
          [savingsAccounts]="savingsAccounts()"
          [paymentMethods]="paymentMethods()"
          (cancel)="closeModal()"
          (saved)="onSaved($event)"
        />
      </app-bottom-sheet>
    }

    @if (confirmOpen()) {
      <app-bottom-sheet title="Confirmar" (close)="onCancelConfirm()">
        <app-confirm-dialog
          [message]="confirmMessage()"
          (confirmed)="onConfirm()"
          (cancelled)="onCancelConfirm()"
        />
      </app-bottom-sheet>
    }
  `,
  styles: `
    :host { display: block; }
    .empty-message {
      margin: 0;
      color: var(--text-secondary);
      text-align: center;
      padding: var(--space-2) 0;
    }
    .list-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--border-default);
    }
    .list-item:last-child { border-bottom: none; }
    .list-item__icon {
      color: var(--text-secondary);
      font-size: 24px;
    }
    .list-item__content {
      flex: 1;
      min-width: 0;
    }
    .list-item__title {
      display: block;
      font-weight: 600;
      color: var(--text-primary);
    }
    .list-item__subtitle {
      display: block;
      font-size: var(--text-size-small);
      color: var(--text-secondary);
    }
    .list-item__actions {
      display: flex;
      gap: var(--space-1);
    }
    .icon-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      border-radius: var(--radius-md);
      cursor: pointer;
      color: var(--text-secondary);
    }
    .icon-button:hover {
      background: var(--surface-alt);
    }
    .icon--active {
      color: var(--color-primary);
    }
    .summary-line {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin: 0;
    }
    .summary-label {
      color: var(--text-secondary);
    }
    .summary-value {
      font-weight: 600;
      font-family: var(--font-mono);
      color: var(--text-primary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduledSavingsListComponent {
  private readonly service = inject(ScheduledSavingService);
  private readonly savingsService = inject(SavingsService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly savings = signal<ScheduledSaving[]>([]);
  protected readonly savingsAccounts = signal<SavingsAccount[]>([]);
  protected readonly paymentMethods = signal<PaymentMethod[]>([]);
  protected readonly editingSaving = signal<ScheduledSaving | null>(null);
  protected readonly modalOpen = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly confirmMessage = signal('');
  protected readonly confirmAction = signal<(() => void) | null>(null);

  protected readonly totalMonthly = computed(() => {
    return this.savings()
      .filter((s) => s.isActive)
      .reduce((sum, s) => {
        const multiplier = s.frequency === 'weekly' ? 4 : s.frequency === 'biweekly' ? 2 : 1;
        return sum + s.amount * multiplier;
      }, 0);
  });

  constructor() {
    void this.load();
  }

  protected frequencyLabel(frequency: string): string {
    switch (frequency) {
      case 'monthly': return 'Mensual';
      case 'biweekly': return 'Quincenal';
      case 'weekly': return 'Semanal';
      default: return frequency;
    }
  }

  protected savingSavingsAccountName(saving: ScheduledSaving): string {
    const account = this.savingsAccounts().find((a) => a.id === saving.savingsAccountId);
    return account?.name ?? '';
  }

  protected openAdd(): void {
    this.editingSaving.set(null);
    this.modalOpen.set(true);
  }

  protected openEdit(saving: ScheduledSaving): void {
    this.editingSaving.set(saving);
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.editingSaving.set(null);
    this.modalOpen.set(false);
  }

  protected async onSaved(data: Partial<ScheduledSaving>): Promise<void> {
    try {
      const editing = this.editingSaving();
      if (editing?.id !== undefined) {
        await this.service.update(editing.id, data);
        this.toast.show('Ahorro programado actualizado.');
      } else {
        await this.service.create(data as Omit<ScheduledSaving, 'id'>);
        this.toast.show('Ahorro programado creado.');
      }
      this.closeModal();
      await this.load();
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'Error al guardar.');
    }
  }

  protected async toggleActive(saving: ScheduledSaving): Promise<void> {
    if (saving.id === undefined) return;
    try {
      await this.service.update(saving.id, { isActive: !saving.isActive });
      await this.load();
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'Error al actualizar.');
    }
  }

  protected confirmDelete(saving: ScheduledSaving): void {
    this.confirmMessage.set(`¿Eliminar el ahorro programado "${saving.name}"?`);
    this.confirmAction.set(() => {
      void (async () => {
        try {
          await this.service.delete(saving.id!);
          this.toast.show('Ahorro programado eliminado.');
          await this.load();
        } catch (error) {
          this.toast.show(error instanceof Error ? error.message : 'Error al eliminar.');
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

  private async load(): Promise<void> {
    const [savings, accounts, methods] = await Promise.all([
      this.service.getAll(),
      this.savingsService.getAll(),
      this.paymentMethodService.getAll(),
    ]);
    this.savings.set(savings);
    this.savingsAccounts.set(accounts);
    this.paymentMethods.set(methods);
  }
}
