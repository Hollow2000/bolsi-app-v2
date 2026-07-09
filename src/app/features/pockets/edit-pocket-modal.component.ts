import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';

import { MATERIAL_ICONS } from '../../core/catalogs';
import type { Pocket } from '../../core/models/pocket.model';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { IconPickerComponent } from '../../shared/components/icon-picker/icon-picker.component';
import { NumberInputComponent } from '../../shared/components/number-input/number-input.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';

@Component({
  selector: 'app-edit-pocket-modal',
  imports: [ButtonDirective, IconPickerComponent, NumberInputComponent, TextInputComponent],
  templateUrl: './edit-pocket-modal.component.html',
  styleUrl: './edit-pocket-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditPocketModalComponent implements OnInit {
  readonly pocket = input.required<Pocket>();
  readonly cancel = output<void>();
  readonly saved = output<Pocket>();

  protected readonly icons = MATERIAL_ICONS;
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly name = signal('');
  protected readonly icon = signal('money_bag');
  protected readonly percentage = signal(0);

  ngOnInit(): void {
    const initial = this.pocket();
    this.name.set(initial.name);
    this.icon.set(initial.icon || 'money_bag');
    this.percentage.set(initial.percentage);
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  protected onSave(): void {
    this.errorMessage.set(null);
    const name = this.name().trim();
    if (!name) {
      this.errorMessage.set('El nombre del bolsillo es obligatorio.');
      return;
    }
    const percentage = this.round(this.percentage());
    if (percentage <= 0) {
      this.errorMessage.set('El porcentaje debe ser mayor a 0.');
      return;
    }
    const updated: Pocket = {
      ...this.pocket(),
      name,
      icon: this.icon() || 'money_bag',
      percentage,
    };
    this.saved.emit(updated);
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
