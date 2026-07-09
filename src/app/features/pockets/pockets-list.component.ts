import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import type { Pocket } from '../../core/models/pocket.model';
import { PocketService } from '../../core/services/pocket.service';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { IconButtonDirective } from '../../shared/components/icon-button/icon-button.directive';
import { ListItemComponent } from '../../shared/components/list-item/list-item.component';
import { ToastService } from '../../shared/services/toast.service';
import { EditPocketModalComponent } from './edit-pocket-modal.component';

@Component({
  selector: 'app-pockets-list',
  imports: [
    BottomSheetComponent,
    CardComponent,
    ConfirmDialogComponent,
    EditPocketModalComponent,
    IconButtonDirective,
    ListItemComponent,
    RouterLink,
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
            @for (pocket of pockets(); track $index) {
              <li class="pocket-row">
                <a class="pocket-link" [routerLink]="['/pockets', pocket.id]">
                  <app-list-item
                    [icon]="pocket.icon || 'money_bag'"
                    [title]="pocket.name"
                    [subtitle]="pocket.percentage + '%'"
                  />
                  <span class="material-symbols-outlined icon pocket-chevron" aria-hidden="true">chevron_right</span>
                </a>
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

    @if (confirmOpen()) {
      <app-bottom-sheet title="Confirmar" (close)="onCancelConfirm()">
        <app-confirm-dialog
          [message]="confirmMessage()"
          (confirmed)="onConfirm()"
          (cancelled)="onCancelConfirm()"
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
        padding: var(--space-2) var(--space-4);
        border-bottom: 1px solid var(--border-default);
      }
      .pocket-row:last-child { border-bottom: none; }
      .pocket-link {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: var(--space-2);
        text-decoration: none;
        color: inherit;
        min-height: 44px;
      }
      .pocket-chevron { color: var(--text-secondary); }
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
  protected readonly confirmOpen = signal(false);
  protected readonly confirmMessage = signal('');
  protected readonly confirmAction = signal<(() => void) | null>(null);

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

  protected confirmDelete(pocket: Pocket): void {
    this.confirmMessage.set(`¿Eliminar el bolsillo "${pocket.name}"? Esta acción no se puede deshacer.`);
    this.confirmAction.set(() => {
      if (pocket.id === undefined) return;
      void (async () => {
        try {
          await this.service.delete(pocket.id!);
          this.toast.show('Bolsillo eliminado.');
          await this.load();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'No se pudo eliminar el bolsillo.';
          this.toast.show(message);
        }
      })();
    });
    this.confirmOpen.set(true);
  }

  protected onConfirm(): void {
    this.confirmAction()?.();
    this.confirmOpen.set(false);
    this.confirmAction.set(null);
  }

  protected onCancelConfirm(): void {
    this.confirmOpen.set(false);
    this.confirmAction.set(null);
  }

  private async load(): Promise<void> {
    this.pockets.set(await this.service.getAll());
  }
}
