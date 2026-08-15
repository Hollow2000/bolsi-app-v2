import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';

import type { CatalogItem } from '../../../core/models/catalog.model';
import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-category-selector',
  template: `
    <div class="category-section">
      <label class="category-label">Categoría</label>
      <div class="category-grid">
        @for (cat of categories(); track cat.id) {
          <button
            type="button"
            class="category-chip"
            [class.category-chip--selected]="value() === cat.name"
            (click)="selectCategory(cat)"
          >
            <span class="material-symbols-outlined icon category-chip__icon" aria-hidden="true">{{ cat.icon }}</span>
            <span class="category-chip__name">{{ cat.name }}</span>
          </button>
        }
        @if (categories().length === 0) {
          <p class="empty-message">No hay categorías disponibles.</p>
        }
      </div>
    </div>
  `,
  styles: `
    .category-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    .category-label {
      font-size: var(--text-size-small);
      color: var(--text-secondary);
    }
    .category-grid {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .category-chip {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-full);
      border: 1px solid var(--border-default);
      background: var(--surface);
      font-size: var(--text-size-small);
      color: var(--text-secondary);
      cursor: pointer;
      min-height: 36px;
      transition: all 0.15s ease;
    }
    .category-chip:hover {
      background: var(--surface-alt);
    }
    .category-chip--selected {
      background: var(--color-primary);
      color: var(--color-on-primary);
      border-color: var(--color-primary);
    }
    .category-chip__icon {
      font-size: 18px;
    }
    .category-chip__name {
      white-space: nowrap;
    }
    .empty-message {
      margin: 0;
      color: var(--text-secondary);
      font-size: var(--text-size-small);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategorySelectorComponent implements OnInit {
  private readonly catalogService = inject(CatalogService);

  readonly type = input.required<'expense' | 'income'>();
  readonly value = input<string>('');
  readonly selected = output<CatalogItem>();

  protected readonly categories = signal<CatalogItem[]>([]);

  async ngOnInit(): Promise<void> {
    const cats = await this.catalogService.getByType(this.type());
    this.categories.set(cats);
  }

  protected selectCategory(cat: CatalogItem): void {
    this.selected.emit(cat);
  }
}
