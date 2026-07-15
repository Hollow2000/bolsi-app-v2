import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';

import type { ScheduledSaving, SavingFrequency } from '../../core/models/scheduled-saving.model';
import type { SavingsAccount } from '../../core/models/savings-account.model';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { IconButtonDirective } from '../../shared/components/icon-button/icon-button.directive';
import { IconPickerComponent } from '../../shared/components/icon-picker/icon-picker.component';
import { NumberInputComponent } from '../../shared/components/number-input/number-input.component';
import { SegmentedControlComponent, type SegmentedOption } from '../../shared/components/segmented-control/segmented-control.component';
import { SelectInputComponent } from '../../shared/components/select-input/select-input.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';
import { ToastService } from '../../shared/services/toast.service';

const FREQUENCY_OPTIONS: readonly SegmentedOption<SavingFrequency>[] = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'weekly', label: 'Semanal' },
];

@Component({
  selector: 'app-scheduled-saving-form-modal',
  imports: [
    ButtonDirective,
    IconButtonDirective,
    IconPickerComponent,
    NumberInputComponent,
    SegmentedControlComponent,
    SelectInputComponent,
    TextInputComponent,
  ],
  template: `
    <div class="modal-content">
      <div class="form-field">
        <label class="form-label">Nombre</label>
        <app-text-input
          [value]="name()"
          (valueChange)="name.set($event)"
          placeholder="Ej: Ahorro para vacaciones"
        />
      </div>

      <div class="form-field">
        <label class="form-label">Monto</label>
        <app-number-input
          [value]="amount()"
          (valueChange)="amount.set($event)"
          placeholder="0.00"
        />
      </div>

      <div class="form-field">
        <label class="form-label">Frecuencia</label>
        <app-segmented-control
          ariaLabel="Frecuencia del ahorro"
          [options]="frequencyOptions"
          [value]="frequency()"
          (valueChange)="frequency.set($event)"
        />
      </div>

      @if (frequency() === 'monthly') {
        <div class="form-field">
          <label class="form-label">Día del mes (1-31)</label>
          <app-number-input
            [value]="dayOfMonth()"
            (valueChange)="dayOfMonth.set($event)"
            placeholder="1"
          />
        </div>
      }

      <div class="form-field">
        <label class="form-label">Cuenta de ahorro destino</label>
        <app-select-input
          label="Cuenta de ahorro"
          [value]="savingsAccountId()"
          (valueChange)="savingsAccountId.set($any($event))"
        >
          <option [value]="0" disabled>Seleccionar cuenta</option>
          @for (account of savingsAccounts(); track account.id) {
            <option [value]="account.id!">{{ account.name }}</option>
          }
        </app-select-input>
      </div>

      <div class="form-field">
        <label class="form-label">Cuenta de origen</label>
        <app-select-input
          label="Cuenta de origen"
          [value]="paymentMethodId()"
          (valueChange)="paymentMethodId.set($any($event))"
        >
          <option [value]="0" disabled>Seleccionar cuenta</option>
          @for (method of paymentMethods(); track method.id) {
            <option [value]="method.id!">{{ method.name }}</option>
          }
        </app-select-input>
      </div>

      <div class="form-field">
        <label class="form-label">Icono</label>
        <div class="icon-picker">
          @for (icon of defaultIcons; track icon) {
            <button
              class="icon-button"
              [class.icon-button--selected]="selectedIcon() === icon"
              type="button"
              (click)="selectedIcon.set(icon)"
            >
              <span class="material-symbols-outlined">{{ icon }}</span>
            </button>
          }
        </div>
      </div>

      @if (errorMessage()) {
        <p class="error-message" role="alert">{{ errorMessage() }}</p>
      }

      <div class="modal-actions">
        <button appButton variant="secondary" type="button" (click)="cancel.emit()">Cancelar</button>
        <button appButton variant="primary" type="button" (click)="onSave()">
          {{ saving() ? 'Actualizar' : 'Crear' }}
        </button>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .modal-content {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding: var(--space-4);
    }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    .form-label {
      font-size: var(--text-size-small);
      font-weight: 600;
      color: var(--text-primary);
    }
    .icon-picker {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .icon-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: 1px solid var(--border-default);
      background: var(--surface);
      border-radius: var(--radius-md);
      cursor: pointer;
    }
    .icon-button--selected {
      border-color: var(--color-primary);
      background: var(--color-primary-soft);
    }
    .error-message {
      margin: 0;
      color: var(--color-danger);
      font-size: var(--text-size-small);
    }
    .modal-actions {
      display: flex;
      gap: var(--space-2);
      justify-content: flex-end;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduledSavingFormModalComponent implements OnInit {
  private readonly toast = inject(ToastService);

  readonly saving = input<ScheduledSaving | null>(null);
  readonly savingsAccounts = input.required<SavingsAccount[]>();
  readonly paymentMethods = input.required<PaymentMethod[]>();
  readonly cancel = output<void>();
  readonly saved = output<Partial<ScheduledSaving>>();

  readonly frequencyOptions = FREQUENCY_OPTIONS;
  readonly defaultIcons = ['savings', 'account_balance', 'wallet', 'payments', 'savings', 'local_atm'];

  protected readonly name = signal('');
  protected readonly amount = signal(0);
  protected readonly frequency = signal<SavingFrequency>('monthly');
  protected readonly dayOfMonth = signal(1);
  protected readonly savingsAccountId = signal(0);
  protected readonly paymentMethodId = signal(0);
  protected readonly selectedIcon = signal('savings');
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const saving = this.saving();
    if (saving) {
      this.name.set(saving.name);
      this.amount.set(saving.amount);
      this.frequency.set(saving.frequency);
      this.dayOfMonth.set(saving.dayOfMonth ?? 1);
      this.savingsAccountId.set(saving.savingsAccountId);
      this.paymentMethodId.set(saving.paymentMethodId);
      this.selectedIcon.set(saving.icon ?? 'savings');
    }
  }

  protected onSave(): void {
    this.errorMessage.set(null);

    if (!this.name().trim()) {
      this.errorMessage.set('Ingresa un nombre.');
      return;
    }
    if (this.amount() <= 0) {
      this.errorMessage.set('El monto debe ser mayor a 0.');
      return;
    }
    if (this.savingsAccountId() === 0) {
      this.errorMessage.set('Selecciona una cuenta de ahorro destino.');
      return;
    }
    if (this.paymentMethodId() === 0) {
      this.errorMessage.set('Selecciona una cuenta de origen.');
      return;
    }

    const data: Partial<ScheduledSaving> = {
      name: this.name().trim(),
      amount: this.amount(),
      frequency: this.frequency(),
      savingsAccountId: this.savingsAccountId(),
      paymentMethodId: this.paymentMethodId(),
      isActive: true,
      icon: this.selectedIcon(),
    };

    if (this.frequency() === 'monthly') {
      data.dayOfMonth = this.dayOfMonth();
    }

    this.saved.emit(data);
  }
}
