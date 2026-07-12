import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';

import type { Income } from '../../core/models/income.model';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import { IncomeService } from '../../core/services/income.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { CardComponent } from '../../shared/components/card/card.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { FabComponent } from '../../shared/components/fab/fab.component';
import { IconButtonDirective } from '../../shared/components/icon-button/icon-button.directive';
import { ListItemComponent } from '../../shared/components/list-item/list-item.component';
import { NumberInputComponent } from '../../shared/components/number-input/number-input.component';
import { MexicanCurrencyPipe, formatMexicanCurrency } from '../../shared/pipes/mexican-currency.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { EditIncomeModalComponent } from './edit-income-modal.component';
import { InstallPromptComponent } from '../../shared/components/install-prompt/install-prompt.component';

@Component({
  selector: 'app-income-list',
  imports: [
    BottomSheetComponent,
    ButtonDirective,
    CardComponent,
    ConfirmDialogComponent,
    EditIncomeModalComponent,
    FabComponent,
    IconButtonDirective,
    ListItemComponent,
    MexicanCurrencyPipe,
    NumberInputComponent,
    InstallPromptComponent,
  ],
  templateUrl: './income-list.component.html',
  styleUrl: './income-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeListComponent {
  private readonly incomeService = inject(IncomeService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly toast = inject(ToastService);

  protected readonly incomes = signal<Income[]>([]);
  protected readonly paymentMethods = signal<PaymentMethod[]>([]);
  protected readonly editing = signal<Income | null>(null);
  protected readonly modalOpen = signal(false);
  protected readonly confirmOpen = signal(false);
  protected readonly confirmMessage = signal('');
  protected readonly confirmAction = signal<(() => void) | null>(null);
  protected readonly currentMonth = signal(new Date().getMonth() + 1);
  protected readonly currentYear = signal(new Date().getFullYear());

  protected readonly confirmingIncome = signal<Income | null>(null);
  protected readonly receivedAmount = signal(0);
  protected readonly receiveError = signal<string | null>(null);
  protected readonly savingReceive = signal(false);

  protected readonly totalReceived = computed(() =>
    this.incomes()
      .filter((income) => income.status === 'received')
      .reduce((sum, income) => sum + income.amount, 0),
  );

  protected readonly receivableMethods = computed(() =>
    this.paymentMethods().filter((method) => method.type !== 'credit'),
  );

  protected readonly periodLabel = computed(() => {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    return `${monthNames[this.currentMonth() - 1]} ${this.currentYear()}`;
  });

  constructor() {
    void this.init();
    effect(() => {
      const month = this.currentMonth();
      const year = this.currentYear();
      void this.loadIncomes(month, year);
    });
  }

  private async init(): Promise<void> {
    const methods = await this.paymentMethodService.getAll();
    this.paymentMethods.set(methods);
  }

  protected isCurrentMonth(): boolean {
    const now = new Date();
    return this.currentMonth() === now.getMonth() + 1 && this.currentYear() === now.getFullYear();
  }

  protected prevMonth(): void {
    if (this.currentMonth() === 1) {
      this.currentMonth.set(12);
      this.currentYear.update((y) => y - 1);
    } else {
      this.currentMonth.update((m) => m - 1);
    }
  }

  protected nextMonth(): void {
    if (this.isCurrentMonth()) return;
    if (this.currentMonth() === 12) {
      this.currentMonth.set(1);
      this.currentYear.update((y) => y + 1);
    } else {
      this.currentMonth.update((m) => m + 1);
    }
  }

  protected subtitleFor(income: Income): string {
    const method = this.paymentMethods().find((method) => method.id === income.paymentMethodId);
    const methodName = method?.name ?? '—';
    const status = income.status === 'received' ? 'Recibido' : 'Esperado';
    return `${methodName} · ${status} · ${income.category}`;
  }

  protected openAdd(): void {
    this.editing.set(null);
    this.modalOpen.set(true);
  }

  protected openEdit(income: Income): void {
    this.editing.set(income);
    this.modalOpen.set(true);
  }

  protected closeEdit(): void {
    this.editing.set(null);
    this.modalOpen.set(false);
  }

  protected async onSaved(updated: Income): Promise<void> {
    const previous = this.editing();
    try {
      if (previous) {
        await this.incomeService.update(previous, updated);
        this.toast.show('Ingreso actualizado.');
      } else {
        await this.incomeService.create(updated);
        this.toast.show('Ingreso registrado.');
      }
      this.closeEdit();
      await this.load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el ingreso.';
      this.toast.show(message);
    }
  }

  protected openReceiveConfirm(income: Income): void {
    this.confirmingIncome.set(income);
    this.receivedAmount.set(income.amount);
    this.receiveError.set(null);
    this.savingReceive.set(false);
  }

  protected closeReceiveConfirm(): void {
    this.confirmingIncome.set(null);
    this.receiveError.set(null);
  }

  protected async confirmReceive(): Promise<void> {
    const income = this.confirmingIncome();
    if (!income || income.id === undefined) return;
    const amount = Math.round(this.receivedAmount() * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) {
      this.receiveError.set('El monto debe ser mayor a 0.');
      return;
    }
    this.savingReceive.set(true);
    this.receiveError.set(null);
    try {
      await this.incomeService.markAsReceived(income.id, amount);
      this.toast.show('Ingreso marcado como recibido.');
      this.closeReceiveConfirm();
      await this.load();
    } catch (error) {
      this.receiveError.set(error instanceof Error ? error.message : 'No se pudo marcar como recibido.');
    } finally {
      this.savingReceive.set(false);
    }
  }

  protected confirmDelete(income: Income): void {
    this.confirmMessage.set(`¿Eliminar el ingreso "${income.description}"? Esta acción no se puede deshacer.`);
    this.confirmAction.set(() => {
      void (async () => {
        try {
          await this.incomeService.delete(income);
          this.toast.show('Ingreso eliminado.');
          await this.load();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'No se pudo eliminar el ingreso.';
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
    await this.loadIncomes(this.currentMonth(), this.currentYear());
  }

  private async loadIncomes(month: number, year: number): Promise<void> {
    const incomes = await this.incomeService.getByMonth(month, year);
    this.incomes.set(incomes);
  }
}
