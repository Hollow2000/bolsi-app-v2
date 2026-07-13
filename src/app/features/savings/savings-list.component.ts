import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import type { SavingsAccount } from '../../core/models/savings-account.model';
import { SavingsService } from '../../core/services/savings.service';
import { validateSavingsAccount } from '../../core/validations/savings.validation';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { FabComponent } from '../../shared/components/fab/fab.component';
import { IconButtonDirective } from '../../shared/components/icon-button/icon-button.directive';
import { IconPickerComponent } from '../../shared/components/icon-picker/icon-picker.component';
import { ListItemComponent } from '../../shared/components/list-item/list-item.component';
import { MexicanCurrencyPipe, formatMexicanCurrency } from '../../shared/pipes/mexican-currency.pipe';
import { NumberInputComponent } from '../../shared/components/number-input/number-input.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';
import { ToastService } from '../../shared/services/toast.service';
import { InstallPromptComponent } from '../../shared/components/install-prompt/install-prompt.component';
import { MATERIAL_ICONS } from '../../core/services/catalog.service';

interface AccountDraft {
  name: string;
  icon: string;
  balance: number;
  goal?: number;
}

@Component({
  selector: 'app-savings-list',
  imports: [
    BottomSheetComponent,
    CardComponent,
    ConfirmDialogComponent,
    FabComponent,
    IconButtonDirective,
    IconPickerComponent,
    ListItemComponent,
    MexicanCurrencyPipe,
    NumberInputComponent,
    RouterLink,
    TextInputComponent,
    InstallPromptComponent,
  ],
  template: `
    <div class="app-screen">
      <header class="app-screen-header">
        <h1>Ahorros</h1>
        <span class="screen-period">{{ totalBalance() | mexicanCurrency }}</span>
      </header>
      <app-install-prompt />
      <main class="app-screen-content">
        @if (accounts().length === 0) {
          <app-card title="Sin cuentas de ahorro">
            <p class="empty-message">No tienes cuentas de ahorro.</p>
          </app-card>
        } @else {
          <ul class="app-list" aria-label="Cuentas de ahorro">
            @for (account of accounts(); track account.id) {
              <li class="savings-row">
                <a class="savings-link" [routerLink]="['/savings', account.id]">
                  <app-list-item
                    [icon]="account.icon || 'savings'"
                    [title]="account.name"
                    [subtitle]="account.balance | mexicanCurrency"
                  />
                  <span class="material-symbols-outlined icon savings-chevron" aria-hidden="true">chevron_right</span>
                </a>
                <button
                  appIconButton
                  type="button"
                  aria-label="Editar cuenta"
                  (click)="openEdit(account)"
                >
                  <span class="material-symbols-outlined icon icon--small" aria-hidden="true">edit</span>
                </button>
                <button
                  appIconButton
                  type="button"
                  aria-label="Eliminar cuenta"
                  (click)="confirmDelete(account)"
                >
                  <span class="material-symbols-outlined icon icon--small" aria-hidden="true">delete</span>
                </button>
              </li>
            }
          </ul>
        }
      </main>
      <app-fab icon="add" ariaLabel="Crear cuenta de ahorro" (press)="openAdd()" />
    </div>

    @if (showForm()) {
      <app-bottom-sheet [title]="editingAccount() ? 'Editar cuenta' : 'Nueva cuenta'" (close)="closeForm()">
        <div class="form-content">
          <app-text-input
            label="Nombre"
            [value]="draft().name"
            (valueChange)="onDraftChange('name', $event)"
          />
          <div class="form-field">
            <label class="form-label">Icono</label>
            <app-icon-picker
              [icons]="icons"
              [(value)]="draftIcon"
            />
          </div>
          @if (!editingAccount()) {
            <app-number-input
              label="Saldo inicial"
              [value]="draft().balance"
              (valueChange)="onDraftChange('balance', $event)"
            />
          }
          <app-number-input
            label="Meta (opcional)"
            [value]="draft().goal ?? 0"
            (valueChange)="onDraftChange('goal', $event || undefined)"
          />
          @if (formError()) {
            <p class="form-error" role="alert">{{ formError() }}</p>
          }
          <button
            appButton
            type="button"
            class="form-submit"
            (click)="saveAccount()"
          >
            {{ editingAccount() ? 'Guardar cambios' : 'Crear cuenta' }}
          </button>
        </div>
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
  styles: [
    `
      :host { display: block; }
      .screen-period {
        font-size: var(--text-size-small);
        color: var(--text-secondary);
      }
      .savings-row {
        display: grid;
        grid-template-columns: 1fr auto auto;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-4);
        border-bottom: 1px solid var(--border-default);
      }
      .savings-row:last-child { border-bottom: none; }
      .savings-link {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: var(--space-2);
        text-decoration: none;
        color: inherit;
        min-height: 44px;
      }
      .savings-chevron { color: var(--text-secondary); }
      .empty-message {
        margin: 0;
        color: var(--text-secondary);
        text-align: center;
        padding: var(--space-2) 0;
      }
      .form-content {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        padding: var(--space-4);
      }
      .form-field { display: flex; flex-direction: column; gap: var(--space-2); }
      .form-label {
        font-size: var(--text-size-small);
        color: var(--text-secondary);
      }
      .form-error {
        margin: 0;
        color: var(--color-danger);
        font-size: var(--text-size-small);
        text-align: center;
      }
      .form-submit { width: 100%; }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SavingsListComponent {
  private readonly service = inject(SavingsService);
  private readonly toast = inject(ToastService);

  protected readonly accounts = signal<SavingsAccount[]>([]);
  protected readonly showForm = signal(false);
  protected readonly editingAccount = signal<SavingsAccount | null>(null);
  protected readonly draft = signal<AccountDraft>({ name: '', icon: 'savings', balance: 0 });
  protected readonly draftIcon = signal('savings');
  protected readonly formError = signal<string | null>(null);
  protected readonly confirmOpen = signal(false);
  protected readonly confirmMessage = signal('');
  protected readonly confirmAction = signal<(() => void) | null>(null);
  protected readonly icons = MATERIAL_ICONS;

  protected readonly totalBalance = computed(() =>
    this.accounts().reduce((sum, account) => sum + account.balance, 0),
  );

  constructor() {
    void this.load();
  }

  protected openAdd(): void {
    this.editingAccount.set(null);
    this.draft.set({ name: '', icon: 'savings', balance: 0 });
    this.draftIcon.set('savings');
    this.formError.set(null);
    this.showForm.set(true);
  }

  protected openEdit(account: SavingsAccount): void {
    this.editingAccount.set(account);
    this.draft.set({
      name: account.name,
      icon: account.icon,
      balance: account.balance,
      goal: account.goal,
    });
    this.draftIcon.set(account.icon);
    this.formError.set(null);
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingAccount.set(null);
    this.formError.set(null);
  }

  protected onDraftChange<K extends keyof AccountDraft>(field: K, value: AccountDraft[K]): void {
    this.draft.update((d) => ({ ...d, [field]: value }));
  }

  protected onIconChange(value: string): void {
    this.draft.update((d) => ({ ...d, icon: value }));
  }

  protected async saveAccount(): Promise<void> {
    const draft = this.draft();
    const icon = this.draftIcon();
    try {
      validateSavingsAccount({ ...draft, icon });
    } catch (error) {
      this.formError.set(error instanceof Error ? error.message : 'Datos inválidos.');
      return;
    }
    try {
      const editing = this.editingAccount();
      if (editing?.id !== undefined) {
        await this.service.update(editing.id, {
          name: draft.name.trim(),
          icon,
          goal: draft.goal ?? undefined,
        });
        this.toast.show('Cuenta actualizada.');
      } else {
        await this.service.create({
          name: draft.name.trim(),
          icon,
          balance: Math.round(draft.balance * 100) / 100,
          goal: draft.goal ?? undefined,
          createdAt: new Date(),
        });
        this.toast.show('Cuenta creada.');
      }
      this.closeForm();
      await this.load();
    } catch (error) {
      this.formError.set(error instanceof Error ? error.message : 'No se pudo guardar.');
    }
  }

  protected confirmDelete(account: SavingsAccount): void {
    this.confirmMessage.set(`¿Eliminar la cuenta "${account.name}"? Se eliminarán todas sus transacciones.`);
    this.confirmAction.set(() => {
      if (account.id === undefined) return;
      void (async () => {
        try {
          await this.service.delete(account.id!);
          this.toast.show('Cuenta eliminada.');
          await this.load();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'No se pudo eliminar.';
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

  private async load(): Promise<void> {
    this.accounts.set(await this.service.getAll());
  }
}
