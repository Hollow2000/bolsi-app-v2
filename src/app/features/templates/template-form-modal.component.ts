import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';

import { EXPENSE_CATEGORIES, MATERIAL_ICONS, type ExpenseCategory } from '../../core/catalogs';
import type { ExpenseTemplate } from '../../core/models/expense-template.model';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import type { Pocket } from '../../core/models/pocket.model';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { IconPickerComponent } from '../../shared/components/icon-picker/icon-picker.component';
import { NumberInputComponent } from '../../shared/components/number-input/number-input.component';
import { SelectInputComponent } from '../../shared/components/select-input/select-input.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';

@Component({
  selector: 'app-template-form-modal',
  imports: [ButtonDirective, IconPickerComponent, NumberInputComponent, SelectInputComponent, TextInputComponent],
  templateUrl: './template-form-modal.component.html',
  styleUrl: './template-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateFormModalComponent implements OnInit {
  readonly paymentMethods = input.required<readonly PaymentMethod[]>();
  readonly pockets = input.required<readonly Pocket[]>();
  readonly template = input<ExpenseTemplate | null>(null);
  readonly cancel = output<void>();
  readonly saved = output<ExpenseTemplate>();

  protected readonly categories = EXPENSE_CATEGORIES;
  protected readonly icons = MATERIAL_ICONS;
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly description = signal('');
  protected readonly amount = signal(0);
  protected readonly paymentMethodId = signal<number>(0);
  protected readonly pocketId = signal<number>(0);
  protected readonly category = signal<ExpenseCategory>(EXPENSE_CATEGORIES[0]);
  protected readonly icon = signal<string>('star');

  ngOnInit(): void {
    const initial = this.template();
    if (initial) {
      this.description.set(initial.description);
      this.amount.set(initial.amount);
      this.paymentMethodId.set(initial.paymentMethodId);
      this.pocketId.set(initial.pocketId);
      this.category.set(initial.category as ExpenseCategory);
      this.icon.set(initial.icon || 'star');
    }
  }

  protected typeLabel(type: PaymentMethod['type']): string {
    if (type === 'cash') return 'Efectivo';
    if (type === 'debit') return 'Débito';
    return 'Crédito';
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
    const amount = Math.round(this.amount() * 100) / 100;
    if (amount <= 0) {
      this.errorMessage.set('El monto debe ser mayor a 0.');
      return;
    }
    const paymentMethodId = this.paymentMethodId();
    if (paymentMethodId === 0) {
      this.errorMessage.set('Selecciona un método de pago.');
      return;
    }
    const pocketId = this.pocketId();
    if (pocketId === 0) {
      this.errorMessage.set('Selecciona un bolsillo.');
      return;
    }
    const previous = this.template();
    const updated: ExpenseTemplate = {
      description,
      amount,
      paymentMethodId,
      pocketId,
      category: this.category(),
      icon: this.icon(),
      sortOrder: previous?.sortOrder ?? 0,
    };
    if (previous?.id !== undefined) {
      updated.id = previous.id;
    }
    this.saved.emit(updated);
  }
}
