import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { EXPENSE_CATEGORIES } from '../../core/catalogs';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import type { Pocket } from '../../core/models/pocket.model';
import { DataPortabilityService } from '../../core/services/data-portability.service';
import { MonthlyPaymentService } from '../../core/services/monthly-payment.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { PocketService } from '../../core/services/pocket.service';
import { SettingsService } from '../../core/services/settings.service';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { CardComponent } from '../../shared/components/card/card.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EditPaymentMethodModalComponent } from '../credit-cards/edit-payment-method-modal.component';
import { EditPocketModalComponent } from '../pockets/edit-pocket-modal.component';
import { IconButtonDirective } from '../../shared/components/icon-button/icon-button.directive';
import { ListItemComponent } from '../../shared/components/list-item/list-item.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-settings',
  imports: [
    BottomSheetComponent,
    ButtonDirective,
    CardComponent,
    ConfirmDialogComponent,
    EditPaymentMethodModalComponent,
    EditPocketModalComponent,
    IconButtonDirective,
    ListItemComponent,
    RouterLink,
    TextInputComponent,
  ],
  template: `
    <div class="app-screen">
      <header class="app-screen-header">
        <h1>Ajustes</h1>
      </header>
      <main class="app-screen-content">
        <app-card title="Métodos de pago">
          <ul class="app-list" aria-label="Métodos de pago">
            @for (method of paymentMethods(); track method.id) {
              <li>
                <app-list-item
                  [icon]="iconFor(method.type)"
                  [title]="method.name"
                  [subtitle]="subtitleFor(method)"
                >
                  <div slot="trailing" class="item-actions">
                    <button
                      appIconButton
                      type="button"
                      aria-label="Editar método de pago"
                      (click)="openEditMethod(method)"
                    >
                      <span class="material-symbols-outlined icon icon--small" aria-hidden="true">edit</span>
                    </button>
                    <button
                      appIconButton
                      type="button"
                      aria-label="Eliminar método de pago"
                      (click)="confirmDeleteMethod(method)"
                    >
                      <span class="material-symbols-outlined icon icon--small" aria-hidden="true">delete</span>
                    </button>
                  </div>
                </app-list-item>
              </li>
            }
          </ul>
          <div class="section-actions">
            <button appButton variant="secondary" type="button" (click)="openAddMethod()">
              <span class="material-symbols-outlined icon icon--small" aria-hidden="true">add</span>
              Agregar método
            </button>
          </div>
        </app-card>

        <app-card title="Bolsillos">
          @if (pocketTotal() !== 100) {
            <p class="warning" role="alert">
              Los porcentajes suman {{ pocketTotal() }}%. Deben sumar exactamente 100%.
            </p>
          }
          <ul class="app-list" aria-label="Bolsillos">
            @for (pocket of pockets(); track pocket.id) {
              <li>
                <app-list-item
                  [icon]="pocket.icon || 'money_bag'"
                  [title]="pocket.name"
                  [subtitle]="pocket.percentage + '%'"
                >
                  <div slot="trailing" class="item-actions">
                    <button
                      appIconButton
                      type="button"
                      aria-label="Editar bolsillo"
                      (click)="openEditPocket(pocket)"
                    >
                      <span class="material-symbols-outlined icon icon--small" aria-hidden="true">edit</span>
                    </button>
                    <button
                      appIconButton
                      type="button"
                      aria-label="Eliminar bolsillo"
                      (click)="confirmDeletePocket(pocket)"
                    >
                      <span class="material-symbols-outlined icon icon--small" aria-hidden="true">delete</span>
                    </button>
                  </div>
                </app-list-item>
              </li>
            }
          </ul>
          <div class="section-actions">
            <button appButton variant="secondary" type="button" (click)="openAddPocket()">
              <span class="material-symbols-outlined icon icon--small" aria-hidden="true">add</span>
              Agregar bolsillo
            </button>
          </div>
        </app-card>

        <app-card title="Categorías personalizadas">
          <ul class="category-list" aria-label="Categorías disponibles">
            @for (cat of allCategories(); track cat) {
              <li class="category-row">
                <span class="category-name">{{ cat }}</span>
                @if (isCustomCategory(cat)) {
                  <button
                    appIconButton
                    type="button"
                    aria-label="Eliminar categoría"
                    (click)="removeCategory(cat)"
                  >
                    <span class="material-symbols-outlined icon icon--small" aria-hidden="true">delete</span>
                  </button>
                }
              </li>
            }
          </ul>
          <div class="add-category">
            <app-text-input
              label="Nueva categoría"
              [value]="newCategory()"
              (valueChange)="newCategory.set($event)"
            />
            <button
              appButton
              variant="primary"
              type="button"
              [disabled]="!newCategory().trim()"
              (click)="addCategory()"
            >
              <span class="material-symbols-outlined icon icon--small" aria-hidden="true">add</span>
              Agregar
            </button>
          </div>
        </app-card>

        <app-card title="Cierre de mes">
          <p class="card-text">
            Replica todos los pagos mensuales recurrentes al mes siguiente. Los
            saldos de los métodos de pago no se tocan.
          </p>
          <div class="section-actions">
            <button appButton variant="primary" type="button" (click)="closeMonth()">
              <span class="material-symbols-outlined icon icon--small" aria-hidden="true">event_repeat</span>
              Cerrar mes actual
            </button>
          </div>
        </app-card>

        <app-card title="Respaldo">
          <p class="card-text">
            Exporta todos los datos a un archivo JSON, o importa uno previamente
            descargado. La importación reemplaza los datos actuales.
          </p>
          <div class="section-actions">
            <button appButton variant="secondary" type="button" (click)="exportData()">
              <span class="material-symbols-outlined icon icon--small" aria-hidden="true">download</span>
              Exportar JSON
            </button>
            <label class="import-button app-button app-button--secondary">
              <span class="material-symbols-outlined icon icon--small" aria-hidden="true">upload</span>
              Importar JSON
              <input
                type="file"
                accept="application/json"
                (change)="onImportFileSelected($event)"
                hidden
              />
            </label>
          </div>
        </app-card>

        <app-card title="Navegación">
          <a appButton variant="secondary" routerLink="/budgets">
            <span class="material-symbols-outlined icon icon--small" aria-hidden="true">savings</span>
            Gestionar presupuestos
          </a>
          <a appButton variant="secondary" routerLink="/history">
            <span class="material-symbols-outlined icon icon--small" aria-hidden="true">history</span>
            Ver historial de meses
          </a>
        </app-card>
      </main>
    </div>

    @if (editingMethod(); as method) {
      <app-bottom-sheet title="Editar método de pago" (close)="closeMethodModal()">
        <app-edit-payment-method-modal
          [paymentMethod]="method"
          (cancel)="closeMethodModal()"
          (saved)="onMethodSaved($event)"
        />
      </app-bottom-sheet>
    }

    @if (editingPocket(); as pocket) {
      <app-bottom-sheet title="Editar bolsillo" (close)="closePocketModal()">
        <app-edit-pocket-modal
          [pocket]="pocket"
          (cancel)="closePocketModal()"
          (saved)="onPocketSaved($event)"
        />
      </app-bottom-sheet>
    }

    @if (confirmOpen()) {
      <app-bottom-sheet title="Confirmar" (close)="onCancelConfirm()">
        <app-confirm-dialog
          [message]="confirmMessage()"
          [confirmTone]="confirmTone()"
          (confirmed)="onConfirm()"
          (cancelled)="onCancelConfirm()"
        />
      </app-bottom-sheet>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .section-actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
        margin-top: var(--space-3);
      }
      .warning {
        margin: 0 0 var(--space-2);
        padding: var(--space-2) var(--space-3);
        background: var(--color-warning-subtle);
        color: var(--color-warning);
        border-radius: var(--radius-medium);
        font-size: var(--text-size-small);
      }
      .category-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        list-style: none;
        margin: 0 0 var(--space-3);
        padding: 0;
      }
      .category-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-2) var(--space-3);
        background: var(--surface-alternate);
        border-radius: var(--radius-medium);
      }
      .category-name {
        font-size: var(--text-size-base);
        color: var(--text-primary);
      }
      .add-category {
        display: flex;
        align-items: end;
        gap: var(--space-2);
      }
      .add-category app-text-input { flex: 1; }
      .import-button {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        cursor: pointer;
      }
      .card-text {
        margin: 0 0 var(--space-2);
        color: var(--text-secondary);
        font-size: var(--text-size-small);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly pocketService = inject(PocketService);
  private readonly settingsService = inject(SettingsService);
  private readonly monthlyPaymentService = inject(MonthlyPaymentService);
  private readonly dataPortability = inject(DataPortabilityService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly paymentMethods = signal<PaymentMethod[]>([]);
  protected readonly pockets = signal<Pocket[]>([]);
  protected readonly customCategories = signal<string[]>([]);
  protected readonly newCategory = signal('');
  protected readonly editingMethod = signal<PaymentMethod | null>(null);
  protected readonly editingPocket = signal<Pocket | null>(null);
  protected readonly confirmOpen = signal(false);
  protected readonly confirmMessage = signal('');
  protected readonly confirmTone = signal<'primary' | 'destructive'>('destructive');
  protected readonly confirmAction = signal<(() => void) | null>(null);

  protected readonly pocketTotal = computed(() =>
    Math.round(this.pockets().reduce((sum, p) => sum + p.percentage, 0)),
  );

  protected readonly allCategories = computed(() => {
    const defaults = EXPENSE_CATEGORIES;
    const customs = this.customCategories();
    return [...defaults, ...customs].filter((c, i, arr) => arr.indexOf(c) === i);
  });

  constructor() {
    void this.load();
  }

  protected iconFor(type: PaymentMethod['type']): string {
    if (type === 'cash') return 'payments';
    if (type === 'debit') return 'account_balance';
    if (type === 'savings') return 'savings';
    return 'credit_card';
  }

  protected subtitleFor(method: PaymentMethod): string {
    if (method.type === 'credit') {
      return `Crédito · Límite ${method.creditLimit ?? 0}`;
    }
    return `Saldo ${method.currentBalance ?? 0}`;
  }

  protected isCustomCategory(category: string): boolean {
    return this.customCategories().includes(category);
  }

  protected openAddMethod(): void {
    this.editingMethod.set({
      type: 'cash',
      name: '',
      currentBalance: 0,
    });
  }

  protected openEditMethod(method: PaymentMethod): void {
    this.editingMethod.set(method);
  }

  protected closeMethodModal(): void {
    this.editingMethod.set(null);
  }

  protected async onMethodSaved(updated: PaymentMethod): Promise<void> {
    const previous = this.editingMethod();
    try {
      if (previous && previous.id !== undefined) {
        await this.paymentMethodService.update(updated);
        this.toast.show('Método de pago actualizado.');
      } else {
        await this.paymentMethodService.create(updated);
        this.toast.show('Método de pago agregado.');
      }
      this.closeMethodModal();
      await this.loadPaymentMethods();
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'No se pudo guardar el método.');
    }
  }

  protected confirmDeleteMethod(method: PaymentMethod): void {
    this.confirmMessage.set(`¿Eliminar "${method.name}"?`);
    this.confirmTone.set('destructive');
    this.confirmAction.set(() => {
      if (method.id === undefined) return;
      void (async () => {
        try {
          await this.paymentMethodService.delete(method.id!);
          this.toast.show('Método de pago eliminado.');
          await this.loadPaymentMethods();
        } catch (error) {
          this.toast.show(error instanceof Error ? error.message : 'No se pudo eliminar.');
        }
      })();
    });
    this.confirmOpen.set(true);
  }

  protected openAddPocket(): void {
    this.editingPocket.set({
      name: '',
      icon: 'money_bag',
      percentage: 0,
      sortOrder: this.pockets().length,
    });
  }

  protected openEditPocket(pocket: Pocket): void {
    this.editingPocket.set(pocket);
  }

  protected closePocketModal(): void {
    this.editingPocket.set(null);
  }

  protected async onPocketSaved(updated: Pocket): Promise<void> {
    const previous = this.editingPocket();
    try {
      if (previous && previous.id !== undefined) {
        await this.pocketService.update(updated);
        this.toast.show('Bolsillo actualizado.');
      } else {
        await this.pocketService.create(updated);
        this.toast.show('Bolsillo agregado.');
      }
      this.closePocketModal();
      await this.loadPockets();
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'No se pudo guardar el bolsillo.');
    }
  }

  protected confirmDeletePocket(pocket: Pocket): void {
    this.confirmMessage.set(`¿Eliminar "${pocket.name}"?`);
    this.confirmTone.set('destructive');
    this.confirmAction.set(() => {
      if (pocket.id === undefined) return;
      void (async () => {
        try {
          await this.pocketService.delete(pocket.id!);
          this.toast.show('Bolsillo eliminado.');
          await this.loadPockets();
        } catch (error) {
          this.toast.show(error instanceof Error ? error.message : 'No se pudo eliminar.');
        }
      })();
    });
    this.confirmOpen.set(true);
  }

  protected async addCategory(): Promise<void> {
    const name = this.newCategory().trim();
    if (!name) return;
    if (this.allCategories().includes(name)) {
      this.toast.show('Esa categoría ya existe.');
      return;
    }
    const next = [...this.customCategories(), name];
    this.customCategories.set(next);
    this.newCategory.set('');
    await this.persistCustomCategories(next);
    this.toast.show('Categoría agregada.');
  }

  protected removeCategory(category: string): void {
    this.confirmMessage.set(`¿Eliminar la categoría "${category}"?`);
    this.confirmTone.set('destructive');
    this.confirmAction.set(() => {
      void (async () => {
        const next = this.customCategories().filter((c) => c !== category);
        this.customCategories.set(next);
        await this.persistCustomCategories(next);
        this.toast.show('Categoría eliminada.');
      })();
    });
    this.confirmOpen.set(true);
  }

  protected closeMonth(): void {
    this.confirmMessage.set('¿Cerrar el mes actual? Los pagos recurrentes se replicarán al siguiente.');
    this.confirmTone.set('destructive');
    this.confirmAction.set(() => {
      void (async () => {
        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        try {
          const count = await this.monthlyPaymentService.replicateRecurring(month, year, nextMonth, nextYear);
          this.toast.show(`${count} pago(s) recurrente(s) replicado(s) al siguiente mes.`);
        } catch (error) {
          this.toast.show(error instanceof Error ? error.message : 'No se pudo cerrar el mes.');
        }
      })();
    });
    this.confirmOpen.set(true);
  }

  protected async exportData(): Promise<void> {
    try {
      await this.dataPortability.exportToFile();
      this.toast.show('Respaldo descargado.');
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'No se pudo exportar.');
    }
  }

  protected async onImportFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.confirmMessage.set('¿Importar este archivo? Reemplazará todos los datos actuales.');
    this.confirmTone.set('primary');
    this.confirmAction.set(() => {
      void (async () => {
        try {
          await this.dataPortability.importFromFile(file);
          this.toast.show('Datos importados. Recargando…');
          setTimeout(() => window.location.reload(), 800);
        } catch (error) {
          this.toast.show(error instanceof Error ? error.message : 'No se pudo importar.');
        } finally {
          input.value = '';
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
    await Promise.all([
      this.loadPaymentMethods(),
      this.loadPockets(),
      this.loadSettings(),
    ]);
  }

  private async loadPaymentMethods(): Promise<void> {
    this.paymentMethods.set(await this.paymentMethodService.getAll());
  }

  private async loadPockets(): Promise<void> {
    this.pockets.set(await this.pocketService.getAll());
  }

  private async loadSettings(): Promise<void> {
    const record = await this.settingsService.get();
    this.customCategories.set(record?.customExpenseCategories ?? []);
  }

  private async persistCustomCategories(categories: string[]): Promise<void> {
    const record = await this.settingsService.get();
    await this.settingsService.save({
      userName: record?.userName ?? '',
      setupComplete: record?.setupComplete ?? true,
      customExpenseCategories: categories,
    });
  }
}
