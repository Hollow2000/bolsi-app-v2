import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';

import { EXPENSE_CATEGORIES, INSTALLMENT_OPTIONS, type ExpenseCategory } from '../../core/catalogs';
import type { Expense } from '../../core/models/expense.model';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import type { Pocket } from '../../core/models/pocket.model';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { DateInputComponent } from '../../shared/components/date-input/date-input.component';
import { NumberInputComponent } from '../../shared/components/number-input/number-input.component';
import { SegmentedControlComponent, type SegmentedOption } from '../../shared/components/segmented-control/segmented-control.component';
import { SelectInputComponent } from '../../shared/components/select-input/select-input.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';
import { MexicanCurrencyPipe } from '../../shared/pipes/mexican-currency.pipe';

/**
 * Form for adding or editing an expense. Pure presentational: the
 * parent owns persistence. Supports MSI (meses sin intereses) when the
 * selected payment method is a credit card — in that case the user
 * picks the number of installments and the modal previews the monthly
 * amount.
 */
@Component({
  selector: 'app-expense-form-modal',
  imports: [
    ButtonDirective,
    DateInputComponent,
    MexicanCurrencyPipe,
    NumberInputComponent,
    SegmentedControlComponent,
    SelectInputComponent,
    TextInputComponent,
  ],
  template: `
    <app-text-input
      label="Descripción"
      [value]="description()"
      (valueChange)="description.set($event)"
    />

    <div class="modal-row">
      <app-number-input
        label="Monto"
        placeholder="0.00"
        [min]="0"
        [value]="amount()"
        (valueChange)="onAmountChange($event)"
      />
      <app-date-input
        label="Fecha"
        [value]="date()"
        (valueChange)="date.set($event)"
      />
    </div>

    <app-select-input
      label="Método de pago"
      [valueType]="'number'"
      [value]="paymentMethodId()"
      (valueChange)="onPaymentMethodChange($any($event))"
    >
      <option value="0" disabled [selected]="paymentMethodId() === 0">Selecciona un método</option>
      @for (method of paymentMethods(); track method.id) {
        <option [value]="method.id" [selected]="method.id === paymentMethodId()">
          {{ method.name }} ({{ typeLabel(method.type) }})
        </option>
      }
    </app-select-input>

    <app-select-input
      label="Bolsillo"
      [valueType]="'number'"
      [value]="pocketId()"
      (valueChange)="pocketId.set($any($event))"
    >
      <option value="0" disabled [selected]="pocketId() === 0">Selecciona un bolsillo</option>
      @for (pocket of pockets(); track pocket.id) {
        <option [value]="pocket.id" [selected]="pocket.id === pocketId()">
          {{ pocket.emoji }} {{ pocket.name }} ({{ pocket.percentage }}%)
        </option>
      }
    </app-select-input>

    <app-select-input
      label="Categoría"
      [valueType]="'string'"
      [value]="category()"
      (valueChange)="category.set($any($event))"
    >
      @for (item of categories; track item) {
        <option [value]="item" [selected]="item === category()">{{ item }}</option>
      }
    </app-select-input>

    @if (isCreditSelected()) {
      <div class="msi-toggle">
        <label class="msi-toggle__label">
          <input
            type="checkbox"
            [checked]="isInstallment()"
            (change)="onInstallmentToggle($event)"
          />
          <span>A meses sin intereses (MSI)</span>
        </label>
      </div>

      @if (isInstallment()) {
        <app-segmented-control
          ariaLabel="Número de meses sin intereses"
          [options]="installmentOptions"
          [value]="installmentMonths()"
          (valueChange)="installmentMonths.set($any($event))"
        />
        <p class="msi-preview">
          {{ installmentCount() }} pagos de
          <strong>{{ monthlyInstallment() | mexicanCurrency }}</strong>
          cada uno. Se descuenta el total ({{ amount() | mexicanCurrency }}) del crédito disponible de la tarjeta al registrar.
        </p>
      }
    }

    @if (errorMessage(); as message) {
      <p class="modal-error" role="alert">{{ message }}</p>
    }

    <div class="modal-actions">
      <button appButton variant="secondary" type="button" (click)="onCancel()">
        Cancelar
      </button>
      <button appButton variant="primary" type="button" (click)="onSave()">
        {{ submitLabel() }}
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }
      .modal-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-3);
      }
      .msi-toggle {
        background: var(--color-primary-muted);
        border-radius: var(--radius-medium);
        padding: var(--space-3);
      }
      .msi-toggle__label {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--text-size-base);
        font-weight: 500;
        color: var(--color-primary);
        cursor: pointer;
      }
      .msi-toggle__label input {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }
      .msi-preview {
        margin: 0;
        padding: var(--space-3);
        background: var(--surface-alternate);
        border-radius: var(--radius-medium);
        font-size: var(--text-size-small);
        color: var(--text-primary);
      }
      .msi-preview strong {
        color: var(--color-primary);
        font-family: var(--font-family-mono);
      }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-2);
        margin-top: var(--space-2);
      }
      .modal-error {
        font-size: var(--text-size-extra-small);
        color: var(--color-danger);
        margin: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseFormModalComponent implements OnInit {
  readonly paymentMethods = input.required<readonly PaymentMethod[]>();
  readonly pockets = input.required<readonly Pocket[]>();
  readonly expense = input<Expense | null>(null);
  readonly cancel = output<void>();
  readonly saved = output<Expense>();

  protected readonly categories = EXPENSE_CATEGORIES;
  protected readonly installmentOptions: readonly SegmentedOption<number>[] = INSTALLMENT_OPTIONS.map(
    (value) => ({ value, label: `${value} MSI` }),
  );
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly description = signal('');
  protected readonly amount = signal(0);
  protected readonly date = signal('');
  protected readonly paymentMethodId = signal<number>(0);
  protected readonly pocketId = signal<number>(0);
  protected readonly category = signal<ExpenseCategory>(EXPENSE_CATEGORIES[0]);
  protected readonly isInstallment = signal(false);
  protected readonly installmentMonths = signal<number>(INSTALLMENT_OPTIONS[1]);

  protected readonly selectedPaymentMethod = computed<PaymentMethod | null>(() => {
    const id = this.paymentMethodId();
    return this.paymentMethods().find((method) => method.id === id) ?? null;
  });

  protected readonly isCreditSelected = computed(() => this.selectedPaymentMethod()?.type === 'credit');

  protected readonly installmentCount = computed(() => this.installmentMonths());

  protected readonly monthlyInstallment = computed(() => {
    const months = this.installmentMonths();
    if (months < 2) {
      return 0;
    }
    return Math.round((this.amount() / months) * 100) / 100;
  });

  ngOnInit(): void {
    const initial = this.expense();
    if (initial) {
      this.description.set(initial.description);
      this.amount.set(initial.amount);
      this.date.set(initial.date);
      this.paymentMethodId.set(initial.paymentMethodId);
      this.pocketId.set(initial.pocketId);
      this.category.set(initial.category as ExpenseCategory);
      this.isInstallment.set(initial.isInstallment);
      if (initial.installmentMonths !== undefined) {
        this.installmentMonths.set(initial.installmentMonths);
      }
    } else {
      this.date.set(this.todayIso());
    }
  }

  protected typeLabel(type: PaymentMethod['type']): string {
    if (type === 'cash') return 'Efectivo';
    if (type === 'debit') return 'Débito';
    return 'Crédito';
  }

  protected submitLabel(): string {
    return this.expense() ? 'Guardar cambios' : 'Agregar gasto';
  }

  protected onAmountChange(value: number): void {
    this.amount.set(value);
  }

  protected onPaymentMethodChange(value: number | string | null): void {
    const id = typeof value === 'number' ? value : 0;
    this.paymentMethodId.set(id);
    const method = this.paymentMethods().find((m) => m.id === id);
    if (method?.type !== 'credit' && this.isInstallment()) {
      this.isInstallment.set(false);
    }
  }

  protected onInstallmentToggle(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.isInstallment.set(input.checked);
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  protected onSave(): void {
    this.errorMessage.set(null);
    const description = this.description().trim();
    if (!description) {
      this.errorMessage.set('La descripción es obligatoria.');
      return;
    }
    const amount = this.round(this.amount());
    if (amount <= 0) {
      this.errorMessage.set('El monto debe ser mayor a 0.');
      return;
    }
    const date = this.date();
    const parts = date.split('-').map((segment) => Number(segment));
    if (parts.length !== 3 || parts.some((segment) => !Number.isInteger(segment))) {
      this.errorMessage.set('La fecha no es válida.');
      return;
    }
    const [year, month] = parts;
    const paymentMethodId = this.paymentMethodId();
    const pocketId = this.pocketId();
    if (paymentMethodId === 0) {
      this.errorMessage.set('Selecciona un método de pago.');
      return;
    }
    if (pocketId === 0) {
      this.errorMessage.set('Selecciona un bolsillo.');
      return;
    }

    const previous = this.expense();
    const installment = this.isInstallment() ? this.installmentMonths() : undefined;
    const updated: Expense = {
      ...(previous ?? {}),
      date,
      description,
      amount,
      category: this.category(),
      paymentMethodId,
      pocketId,
      month,
      year,
      isInstallment: this.isInstallment(),
      installmentMonths: installment,
      monthlyInstallmentAmount: installment ? this.monthlyInstallment() : undefined,
    };
    if (previous?.id !== undefined) {
      updated.id = previous.id;
    }
    this.saved.emit(updated);
  }

  private todayIso(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
