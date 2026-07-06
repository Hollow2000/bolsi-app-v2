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
import { MexicanCurrencyPipe } from '../../shared/pipes/mexican-currency.pipe';
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
  template: `
    <div class="app-screen">
      <header class="app-screen-header">
        <h1>Ingresos</h1>
        <span class="screen-period">{{ periodLabel() }}</span>
      </header>
      <main class="app-screen-content">
        <app-card title="Total del mes">
          <p class="total-amount">{{ totalReceived() | mexicanCurrency }}</p>
          <p class="total-subtitle">Recibido este mes</p>
        </app-card>

        @if (incomes().length === 0) {
          <app-card title="Sin ingresos">
            <p class="empty-message">No hay ingresos registrados este mes.</p>
          </app-card>
        } @else {
          <ul class="app-list" aria-label="Ingresos del mes">
            @for (income of incomes(); track income.id) {
              <li class="app-list-row">
                <app-list-item
                  [icon]="income.status === 'received' ? 'arrow_downward' : 'schedule'"
                  [title]="income.description"
                  [subtitle]="subtitleFor(income)"
                  [amount]="(income.amount | mexicanCurrency) ?? ''"
                  [tone]="income.status === 'received' ? 'income' : 'default'"
                />
                <div class="item-actions">
                  @if (income.status === 'expected' && income.id !== undefined) {
                    <button
                      appIconButton
                      type="button"
                      aria-label="Marcar ingreso como recibido"
                      (click)="markAsReceived(income.id!)"
                    >
                      <span class="material-symbols-outlined icon icon--small" aria-hidden="true">check_circle</span>
                    </button>
                  }
                  <button
                    appIconButton
                    type="button"
                    aria-label="Editar ingreso"
                    (click)="openEdit(income)"
                  >
                    <span class="material-symbols-outlined icon icon--small" aria-hidden="true">edit</span>
                  </button>
                  <button
                    appIconButton
                    type="button"
                    aria-label="Eliminar ingreso"
                    (click)="confirmDelete(income)"
                  >
                    <span class="material-symbols-outlined icon icon--small" aria-hidden="true">delete</span>
                  </button>
                </div>
              </li>
            }
          </ul>
        }
      </main>
      <app-fab icon="add" ariaLabel="Registrar nuevo ingreso" (press)="openAdd()" />
    </div>

    @if (modalOpen()) {
      <app-bottom-sheet
        [title]="editing() ? 'Editar ingreso' : 'Nuevo ingreso'"
        (close)="closeEdit()"
      >
        <app-edit-income-modal
          [income]="editing()"
          [receivableMethods]="receivableMethods()"
          (cancel)="closeEdit()"
          (saved)="onSaved($event)"
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
      .total-amount {
        margin: 0;
        font-size: var(--text-size-extra-large);
        font-weight: 700;
        color: var(--color-success);
        font-family: var(--font-family-mono);
      }
      .total-subtitle {
        margin: 0;
        font-size: var(--text-size-small);
        color: var(--text-secondary);
      }
      .empty-message {
        margin: 0;
        color: var(--text-secondary);
        text-align: center;
        padding: var(--space-2) 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeListComponent {
  private readonly incomeService = inject(IncomeService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly toast = inject(ToastService);
  private readonly currency = inject(MexicanCurrencyPipe);

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
