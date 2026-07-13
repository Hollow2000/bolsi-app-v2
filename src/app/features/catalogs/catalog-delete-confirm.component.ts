import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import type { CatalogItem } from '../../core/models/catalog.model';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { SelectInputComponent } from '../../shared/components/select-input/select-input.component';

@Component({
  selector: 'app-catalog-delete-confirm',
  imports: [
    ButtonDirective,
    SelectInputComponent,
  ],
  template: `
    <div class="delete-confirm">
      <p class="delete-confirm__message">
        ¿Eliminar la categoría <strong>{{ catalog().name }}</strong>?
      </p>
      @if (affectedCount() > 0) {
        <p class="delete-confirm__warning">
          Hay {{ affectedCount() }} registro(s) que usan esta categoría.
        </p>
        <app-select-input
          label="Reasignar a"
          [valueType]="'string'"
          [value]="reassignTo()"
          (valueChange)="reassignTo.set($any($event))"
        >
          <option value="" disabled [selected]="reassignTo() === ''">Seleccionar categoría</option>
          @for (cat of otherCategories(); track cat.name) {
            <option [value]="cat.name" [selected]="reassignTo() === cat.name">
              {{ cat.name }}
            </option>
          }
        </app-select-input>
      }
      <div class="delete-confirm__actions">
        <button
          appButton
          type="button"
          class="delete-confirm__btn delete-confirm__btn--cancel"
          (click)="cancel.emit()"
        >
          Cancelar
        </button>
        <button
          appButton
          type="button"
          class="delete-confirm__btn delete-confirm__btn--delete"
          [disabled]="affectedCount() > 0 && !reassignTo()"
          (click)="confirm()"
        >
          {{ affectedCount() > 0 ? 'Eliminar y reasignar' : 'Eliminar' }}
        </button>
      </div>
    </div>
  `,
  styles: `
    .delete-confirm {
      padding: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .delete-confirm__message {
      margin: 0;
      font-size: var(--text-size-base);
      color: var(--text-primary);
      text-align: center;
    }
    .delete-confirm__warning {
      margin: 0;
      font-size: var(--text-size-small);
      color: var(--color-warning);
      text-align: center;
      padding: var(--space-2);
      background: var(--color-warning-subtle);
      border-radius: var(--radius-medium);
    }
    .delete-confirm__actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-3);
    }
    .delete-confirm__btn { width: 100%; }
    .delete-confirm__btn--cancel {
      background: var(--surface);
      color: var(--text-secondary);
    }
    .delete-confirm__btn--delete {
      background: var(--color-danger);
      color: white;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogDeleteConfirmComponent {
  readonly catalog = input.required<CatalogItem>();
  readonly affectedCount = input<number>(0);
  readonly otherCategories = input.required<CatalogItem[]>();
  readonly cancel = output<void>();
  readonly confirmed = output<string>();

  protected readonly reassignTo = signal('');

  protected confirm(): void {
    if (this.affectedCount() > 0 && !this.reassignTo()) return;
    this.confirmed.emit(this.reassignTo());
  }
}
