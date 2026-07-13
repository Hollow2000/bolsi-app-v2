import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';

import type { PaymentMethod, PaymentMethodType } from '../../core/models/payment-method.model';
import { validatePaymentMethod } from '../../core/validations/payment-method.validation';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { NumberInputComponent } from '../../shared/components/number-input/number-input.component';
import { SegmentedControlComponent, type SegmentedOption } from '../../shared/components/segmented-control/segmented-control.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';

const TYPE_OPTIONS: readonly SegmentedOption<PaymentMethodType>[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'debit', label: 'Débito' },
  { value: 'credit', label: 'Crédito' },
];

/**
 * Form for editing a payment method. Pure presentational: the parent
 * (onboarding wizard, list screen, etc.) is responsible for persisting
 * the emitted `saved` value. The modal runs the same pure validation
 * the service uses, so the parent never receives an invalid record.
 */
@Component({
  selector: 'app-edit-payment-method-modal',
  imports: [
    ButtonDirective,
    NumberInputComponent,
    SegmentedControlComponent,
    TextInputComponent,
  ],
  templateUrl: './edit-payment-method-modal.component.html',
  styleUrl: './edit-payment-method-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditPaymentMethodModalComponent implements OnInit {
  readonly paymentMethod = input.required<PaymentMethod>();
  readonly cancel = output<void>();
  readonly saved = output<PaymentMethod>();

  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly name = signal('');
  protected readonly type = signal<PaymentMethodType>('cash');
  protected readonly currentBalance = signal(0);
  protected readonly creditLimit = signal(0);
  protected readonly closingDay = signal(1);
  protected readonly creditDays = signal(20);
  protected readonly skipHolidays = signal(false);

  protected readonly isCredit = computed(() => this.type() === 'credit');

  ngOnInit(): void {
    const initial = this.paymentMethod();
    this.name.set(initial.name);
    this.type.set(initial.type);
    this.currentBalance.set(initial.currentBalance ?? 0);
    this.creditLimit.set(initial.creditLimit ?? 0);
    this.closingDay.set(initial.statementClosingDay ?? 1);
    this.creditDays.set(initial.creditDays ?? 20);
    this.skipHolidays.set(initial.skipHolidays ?? false);
  }

  protected onTypeChange(type: PaymentMethodType): void {
    this.type.set(type);
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  protected onSave(): void {
    this.errorMessage.set(null);
    const previous = this.paymentMethod();
    const updated = this.buildUpdated(previous);
    try {
      validatePaymentMethod(updated);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Datos inválidos.');
      return;
    }
    this.saved.emit(updated);
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
        skipHolidays: this.skipHolidays(),
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
