import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import type { CatalogItem } from '../../core/models/catalog.model';
import { CatalogService } from '../../core/services/catalog.service';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { FabComponent } from '../../shared/components/fab/fab.component';
import { IconButtonDirective } from '../../shared/components/icon-button/icon-button.directive';
import { ListItemComponent } from '../../shared/components/list-item/list-item.component';
import { ToastService } from '../../shared/services/toast.service';
import { InstallPromptComponent } from '../../shared/components/install-prompt/install-prompt.component';
import { CatalogFormModalComponent } from './catalog-form-modal.component';
import { CatalogDeleteConfirmComponent } from './catalog-delete-confirm.component';

@Component({
  selector: 'app-catalogs',
  imports: [
    BottomSheetComponent,
    CardComponent,
    FabComponent,
    IconButtonDirective,
    ListItemComponent,
    CatalogFormModalComponent,
    CatalogDeleteConfirmComponent,
    InstallPromptComponent,
  ],
  template: `
    <div class="app-screen">
      <header class="app-screen-header">
        <h1>Categorías</h1>
      </header>
      <app-install-prompt />
      <main class="app-screen-content">
        <div class="tab-row">
          <button
            type="button"
            class="tab-btn"
            [class.tab-btn--active]="activeTab() === 'expense'"
            (click)="activeTab.set('expense')"
          >
            Gastos
          </button>
          <button
            type="button"
            class="tab-btn"
            [class.tab-btn--active]="activeTab() === 'income'"
            (click)="activeTab.set('income')"
          >
            Ingresos
          </button>
        </div>

        @if (filteredCategories().length === 0) {
          <app-card title="Sin categorías">
            <p class="empty-message">No hay categorías.</p>
          </app-card>
        } @else {
          <ul class="app-list" aria-label="Categorías">
            @for (cat of filteredCategories(); track cat.id) {
              <li class="catalog-row">
                <app-list-item
                  [icon]="cat.icon"
                  [title]="cat.name"
                  [subtitle]="cat.isDefault ? 'Por defecto' : 'Personalizada'"
                />
                <button
                  appIconButton
                  type="button"
                  aria-label="Editar categoría"
                  (click)="openEdit(cat)"
                >
                  <span class="material-symbols-outlined icon icon--small" aria-hidden="true">edit</span>
                </button>
                <button
                  appIconButton
                  type="button"
                  aria-label="Eliminar categoría"
                  (click)="openDelete(cat)"
                >
                  <span class="material-symbols-outlined icon icon--small" aria-hidden="true">delete</span>
                </button>
              </li>
            }
          </ul>
        }
      </main>
      <app-fab icon="add" ariaLabel="Crear categoría" (press)="openAdd()" />
    </div>

    @if (showForm()) {
      <app-bottom-sheet
        [title]="editingCatalog() ? 'Editar categoría' : 'Nueva categoría'"
        (close)="closeForm()"
      >
        <app-catalog-form-modal
          [catalog]="editingCatalog()"
          (cancel)="closeForm()"
          (saved)="onSaved($event)"
        />
      </app-bottom-sheet>
    }

    @if (showDeleteConfirm()) {
      <app-bottom-sheet title="Eliminar categoría" (close)="closeDeleteConfirm()">
        <app-catalog-delete-confirm
          [catalog]="deletingCatalog()!"
          [affectedCount]="affectedCount()"
          [otherCategories]="otherCategories()"
          (cancel)="closeDeleteConfirm()"
          (confirmed)="onDeleteConfirmed($event)"
        />
      </app-bottom-sheet>
    }
  `,
  styles: `
    :host { display: block; }
    .tab-row {
      display: flex;
      gap: var(--space-2);
      margin-bottom: var(--space-4);
    }
    .tab-btn {
      flex: 1;
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius-full);
      border: 1px solid var(--border-default);
      background: var(--surface);
      font-size: var(--text-size-sm);
      color: var(--text-secondary);
      cursor: pointer;
      min-height: var(--tap-target-min);
      transition: all 0.15s ease;
    }
    .tab-btn--active {
      background: var(--color-primary);
      color: var(--color-on-primary);
      border-color: var(--color-primary);
    }
    .catalog-row {
      display: grid;
      grid-template-columns: 1fr auto auto;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-4);
      border-bottom: 1px solid var(--border-default);
    }
    .catalog-row:last-child { border-bottom: none; }
    .empty-message {
      margin: 0;
      color: var(--text-secondary);
      text-align: center;
      padding: var(--space-2) 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogsComponent {
  private readonly catalogService = inject(CatalogService);
  private readonly toast = inject(ToastService);

  protected readonly activeTab = signal<'expense' | 'income'>('expense');
  protected readonly categories = signal<CatalogItem[]>([]);
  protected readonly showForm = signal(false);
  protected readonly editingCatalog = signal<CatalogItem | null>(null);
  protected readonly showDeleteConfirm = signal(false);
  protected readonly deletingCatalog = signal<CatalogItem | null>(null);
  protected readonly affectedCount = signal(0);

  protected readonly filteredCategories = computed(() =>
    this.categories().filter((cat) => cat.type === this.activeTab()),
  );

  protected readonly otherCategories = computed(() =>
    this.filteredCategories().filter((cat) => cat.id !== this.deletingCatalog()?.id),
  );

  constructor() {
    void this.load();
  }

  protected openAdd(): void {
    this.editingCatalog.set(null);
    this.showForm.set(true);
  }

  protected openEdit(cat: CatalogItem): void {
    this.editingCatalog.set(cat);
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingCatalog.set(null);
  }

  protected async onSaved(data: { name: string; icon: string }): Promise<void> {
    const editing = this.editingCatalog();
    try {
      if (editing?.id !== undefined) {
        await this.catalogService.update(editing.id, data);
        this.toast.show('Categoría actualizada.');
      } else {
        await this.catalogService.create({
          type: this.activeTab(),
          name: data.name,
          icon: data.icon,
          isDefault: false,
          sortOrder: 0,
        });
        this.toast.show('Categoría creada.');
      }
      this.closeForm();
      await this.load();
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'No se pudo guardar.');
    }
  }

  protected async openDelete(cat: CatalogItem): Promise<void> {
    this.deletingCatalog.set(cat);
    const count = await this.catalogService.countByCategory(cat.type, cat.name);
    this.affectedCount.set(count);
    this.showDeleteConfirm.set(true);
  }

  protected closeDeleteConfirm(): void {
    this.showDeleteConfirm.set(false);
    this.deletingCatalog.set(null);
    this.affectedCount.set(0);
  }

  protected async onDeleteConfirmed(reassignToName: string): Promise<void> {
    const cat = this.deletingCatalog();
    if (!cat || cat.id === undefined) return;
    try {
      if (reassignToName) {
        await this.catalogService.delete(cat.id, reassignToName);
      } else {
        await this.catalogService.deleteWithoutReassign(cat.id);
      }
      this.toast.show('Categoría eliminada.');
      this.closeDeleteConfirm();
      await this.load();
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'No se pudo eliminar.');
    }
  }

  private async load(): Promise<void> {
    const [expense, income] = await Promise.all([
      this.catalogService.getByType('expense'),
      this.catalogService.getByType('income'),
    ]);
    this.categories.set([...expense, ...income]);
  }
}
