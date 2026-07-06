import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';

import type { PaymentMethod, PaymentMethodType } from '../../core/models/payment-method.model';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { NumberInputComponent } from '../../shared/components/number-input/number-input.component';
import { SegmentedControlComponent, type SegmentedOption } from '../../shared/components/segmented-control/segmented-control.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';

const TYPE_OPTIONS: readonly SegmentedOption<PaymentMethodType>[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'debit', label: 'Débito' },
  { value: 'credit', label: 'Crédito' },
];

@Component({
  selector: 'app-edit-payment-method-modal',
  imports: [
    ButtonDirective,
    NumberInputComponent,
    SegmentedControlComponent,
    TextInputComponent,
  ],
  template: `
    <app-text-input
      label="Nombre"
      [value]="name()"
      (valueChange)="name.set($event)"
    />

    <app-segmented-control
      ariaLabel="Tipo de método de pago"
      [options]="typeOptions"
      [value]="type()"
      (valueChange)="onTypeChange($event)"
    />

    @if (isCredit()) {
      <app-number-input
        label="Límite de crédito"
        placeholder="0.00"
        [min]="0"
        [value]="creditLimit()"
        (valueChange)="creditLimit.set($event)"
      />
      <div class="modal-row">
        <app-number-input
          label="Día de corte"
          placeholder="1"
          [min]="1"
          [max]="31"
          [step]="1"
          [value]="closingDay()"
          (valueChange)="closingDay.set($event)"
        />
        <app-number-input
          label="Días de crédito"
          placeholder="20"
          [min]="1"
          [step]="1"
          [value]="creditDays()"
          (valueChange)="creditDays.set($event)"
        />
      </div>
    } @else {
      <app-number-input
        label="Saldo actual"
        placeholder="0.00"
        [value]="currentBalance()"
        (valueChange)="currentBalance.set($event)"
      />
    }

    @if (errorMessage(); as message) {
      <p class="modal-error" role="alert">{{ message }}</p>
    }

    <div class="modal-actions">
      <button appButton variant="secondary" type="button" (click)="onCancel()">
        Cancelar
      </button>
      <button
        appButton
        variant="primary"
        type="button"
        [disabled]="saving()"
        (click)="onSave()"
      >
        {{ saving() ? 'Guardando…' : 'Guardar cambios' }}
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
export class EditPaymentMethodModalComponent {
  private readonly service = inject(PaymentMethodService);

  readonly paymentMethod = input.required<PaymentMethod>();
  readonly cancel = output<void>();
  readonly saved = output<PaymentMethod>();

  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly name = signal('');
  protected readonly type = signal<PaymentMethodType>('cash');
  protected readonly currentBalance = signal(0);
  protected readonly creditLimit = signal(0);
  protected readonly closingDay = signal(1);
  protected readonly creditDays = signal(20);

  protected readonly isCredit = computed(() => this.type() === 'credit');

  ngOnInit(): void {
    const initial = this.paymentMethod();
    this.name.set(initial.name);
    this.type.set(initial.type);
    this.currentBalance.set(initial.currentBalance ?? 0);
    this.creditLimit.set(initial.creditLimit ?? 0);
    this.closingDay.set(initial.statementClosingDay ?? 1);
    this.creditDays.set(initial.creditDays ?? 20);
  }

  protected onTypeChange(type: PaymentMethodType): void {
    this.type.set(type);
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  protected async onSave(): Promise<void> {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);

    const previous = this.paymentMethod();
    const updated = this.buildUpdated(previous);

    try {
      await this.service.update(updated);
      this.saved.emit(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el método de pago.';
      this.errorMessage.set(message);
    } finally {
      this.saving.set(false);
    }
  }

  private buildUpdated(previous: PaymentMethod): PaymentMethod {
    const type = this.type();
    if (type === 'credit') {
      return {
        ...previous,
        type: 'credit',
        name: this.name().trim(),
        creditLimit: this.round(this.creditLimit()),
        availableCredit: this.round(this.creditLimit()),
        statementClosingDay: Math.min(31, Math.max(1, Math.trunc(this.closingDay()) || 1)),
        creditDays: Math.max(1, Math.trunc(this.creditDays()) || 1),
        currentBalance: undefined,
      };
    }
    return {
      ...previous,
      type,
      name: this.name().trim(),
      currentBalance: this.round(this.currentBalance()),
      creditLimit: undefined,
      availableCredit: undefined,
      statementClosingDay: undefined,
      creditDays: undefined,
    };
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
