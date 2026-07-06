import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import type { Pocket } from '../../core/models/pocket.model';
import { PocketService } from '../../core/services/pocket.service';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { IconButtonDirective } from '../../shared/components/icon-button/icon-button.directive';
import { ListItemComponent } from '../../shared/components/list-item/list-item.component';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { ToastService } from '../../shared/services/toast.service';
import { EditPocketModalComponent } from './edit-pocket-modal.component';

@Component({
  selector: 'app-pockets-list',
  imports: [
    BottomSheetComponent,
    CardComponent,
    EditPocketModalComponent,
    IconButtonDirective,
    ListItemComponent,
    ProgressBarComponent,
  ],
  template: `
    <div class="app-screen">
      <header class="app-screen-header">
        <h1>Bolsillos</h1>
        <span class="screen-period">{{ totalPercentage() }}% asignado</span>
      </header>
      <main class="app-screen-content">
        @if (pockets().length === 0) {
          <app-card title="Sin bolsillos">
            <p class="empty-message">No tienes bolsillos configurados.</p>
          </app-card>
        } @else {
          <ul class="app-list" aria-label="Bolsillos">
            @for (pocket of pockets(); track pocket.id) {
              <li class="pocket-row">
                <app-list-item
                  [icon]="pocket.emoji || 'wallet'"
                  [title]="pocket.name"
                  [subtitle]="pocket.percentage + '%'"
                />
                <button
                  appIconButton
                  type="button"
                  aria-label="Editar bolsillo"
                  (click)="openEdit(pocket)"
                >
                  <span class="material-symbols-outlined icon icon--small" aria-hidden="true">edit</span>
                </button>
                <button
                  appIconButton
                  type="button"
                  aria-label="Eliminar bolsillo"
                  (click)="confirmDelete(pocket)"
                >
                  <span class="material-symbols-outlined icon icon--small" aria-hidden="true">delete</span>
                </button>
                <div class="pocket-progress">
                  <app-progress-bar [value]="0" [max]="100" [autoTone]="false" />
                </div>
              </li>
            }
          </ul>
          @if (totalPercentage() !== 100) {
            <p class="total-warning" role="alert">
              La suma de los porcentajes es {{ totalPercentage() }}%. Debe ser exactamente 100%.
            </p>
          }
        }
      </main>
    </div>

    @if (editing(); as pocket) {
      <app-bottom-sheet title="Editar bolsillo" (close)="closeEdit()">
        <app-edit-pocket-modal
          [pocket]="pocket"
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
      .pocket-row {
        display: grid;
        grid-template-columns: 1fr auto auto;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-4);
        border-bottom: 1px solid var(--border-default);
      }
      .pocket-row:last-child { border-bottom: none; }
      .pocket-row app-list-item { border-bottom: none; padding: 0; }
      .pocket-row app-list-item::ng-deep .app-list-item { padding: 0; }
      .pocket-progress {
        grid-column: 1 / -1;
        margin-top: var(--space-1);
      }
      .total-warning {
        margin: 0;
        font-size: var(--text-size-small);
        color: var(--color-warning);
        background: var(--color-warning-subtle);
        padding: var(--space-3);
        border-radius: var(--radius-medium);
        text-align: center;
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
export class PocketsListComponent {
  private readonly service = inject(PocketService);
  private readonly toast = inject(ToastService);

  protected readonly pockets = signal<Pocket[]>([]);
  protected readonly editing = signal<Pocket | null>(null);

  protected readonly totalPercentage = computed(() =>
    Math.round(this.pockets().reduce((sum, pocket) => sum + pocket.percentage, 0)),
  );

  constructor() {
    void this.load();
  }

  protected openEdit(pocket: Pocket): void {
    this.editing.set(pocket);
  }

  protected closeEdit(): void {
    this.editing.set(null);
  }

  protected async onSaved(updated: Pocket): Promise<void> {
    try {
      await this.service.update(updated);
      this.editing.set(null);
      await this.load();
      this.toast.show('Bolsillo actualizado.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el bolsillo.';
      this.toast.show(message);
    }
  }

  protected async confirmDelete(pocket: Pocket): Promise<void> {
    const confirmed = window.confirm(
      `¿Eliminar el bolsillo "${pocket.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed || pocket.id === undefined) {
      return;
    }
    try {
      await this.service.delete(pocket.id);
      this.toast.show('Bolsillo eliminado.');
      await this.load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el bolsillo.';
      this.toast.show(message);
    }
  }

  private async load(): Promise<void> {
    this.pockets.set(await this.service.getAll());
  }
}
