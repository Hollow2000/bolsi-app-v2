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
import { InstallPromptComponent } from '../../shared/components/install-prompt/install-prompt.component';

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
    InstallPromptComponent,
  ],
  templateUrl: 'settings.component.html',
  styleUrl: 'settings.component.scss',
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
