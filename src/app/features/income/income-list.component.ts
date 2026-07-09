import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import type { Income } from '../../core/models/income.model';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import { IncomeService } from '../../core/services/income.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { FabComponent } from '../../shared/components/fab/fab.component';
import { IconButtonDirective } from '../../shared/components/icon-button/icon-button.directive';
import { ListItemComponent } from '../../shared/components/list-item/list-item.component';
import { MexicanCurrencyPipe, formatMexicanCurrency } from '../../shared/pipes/mexican-currency.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { EditIncomeModalComponent } from './edit-income-modal.component';

@Component({
  selector: 'app-income-list',
  imports: [
    BottomSheetComponent,
    CardComponent,
    EditIncomeModalComponent,
    FabComponent,
    IconButtonDirective,
    ListItemComponent,
    MexicanCurrencyPipe,
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
  protected readonly currentMonth = signal(new Date().getMonth() + 1);
  protected readonly currentYear = signal(new Date().getFullYear());

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
    void this.load();
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

  protected async markAsReceived(id: number): Promise<void> {
    try {
      await this.incomeService.markAsReceived(id);
      this.toast.show('Ingreso marcado como recibido.');
      await this.load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo marcar como recibido.';
      this.toast.show(message);
    }
  }

  protected async confirmDelete(income: Income): Promise<void> {
    const confirmed = window.confirm(
      `¿Eliminar el ingreso "${income.description}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) {
      return;
    }
    try {
      await this.incomeService.delete(income);
      this.toast.show('Ingreso eliminado.');
      await this.load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el ingreso.';
      this.toast.show(message);
    }
  }

  private async load(): Promise<void> {
    const [incomes, methods] = await Promise.all([
      this.incomeService.getByMonth(this.currentMonth(), this.currentYear()),
      this.paymentMethodService.getAll(),
    ]);
    this.incomes.set(incomes);
    this.paymentMethods.set(methods);
  }
}
