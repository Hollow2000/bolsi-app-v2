import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';

import type { CatalogItem } from '../../core/models/catalog.model';
import { MATERIAL_ICONS } from '../../core/services/catalog.service';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { IconPickerComponent } from '../../shared/components/icon-picker/icon-picker.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';

@Component({
  selector: 'app-catalog-form-modal',
  imports: [
    ButtonDirective,
    IconPickerComponent,
    TextInputComponent,
  ],
  template: `
    <div class="catalog-form">
      <app-text-input
        label="Nombre"
        [value]="name()"
        (valueChange)="name.set($event)"
      />
      <div class="form-field">
        <label class="form-label">Icono</label>
        <app-icon-picker
          [icons]="icons"
          [(value)]="icon"
        />
      </div>
      @if (errorMessage()) {
        <p class="form-error" role="alert">{{ errorMessage() }}</p>
      }
      <button
        appButton
        type="button"
        class="form-submit"
        (click)="save()"
      >
        {{ catalog() ? 'Guardar cambios' : 'Crear categoría' }}
      </button>
    </div>
  `,
  styles: `
    .catalog-form {
      padding: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .form-field { display: flex; flex-direction: column; gap: var(--space-2); }
    .form-label {
      font-size: var(--text-size-small);
      color: var(--text-secondary);
    }
    .form-error {
      margin: 0;
      color: var(--color-danger);
      font-size: var(--text-size-small);
      text-align: center;
    }
    .form-submit { width: 100%; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogFormModalComponent {
  readonly catalog = input<CatalogItem | null>(null);
  readonly cancel = output<void>();
  readonly saved = output<{ name: string; icon: string }>();

  protected readonly icons = MATERIAL_ICONS;
  protected readonly name = signal('');
  protected readonly icon = signal('category');
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const cat = this.catalog();
    if (cat) {
      this.name.set(cat.name);
      this.icon.set(cat.icon);
    }
  }

  protected save(): void {
    const name = this.name().trim();
    if (!name) {
      this.errorMessage.set('El nombre es obligatorio.');
      return;
    }
    this.saved.emit({ name, icon: this.icon() });
  }
}
