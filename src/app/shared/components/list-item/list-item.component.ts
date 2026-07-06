import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ListItemTone = 'default' | 'income' | 'expense';

/**
 * Compact list item. Used by transactions, settings, and any list view
 * with a leading icon, title, subtitle, and trailing amount/action.
 */
@Component({
  selector: 'app-list-item',
  template: `
    <div class="app-list-item__icon" aria-hidden="true">
      <span class="material-symbols-outlined icon">{{ icon() }}</span>
    </div>
    <div class="app-list-item__content">
      <span class="app-list-item__title">{{ title() }}</span>
      @if (subtitle(); as text) {
        <span class="app-list-item__subtitle">{{ text }}</span>
      }
    </div>
    @if (amount(); as value) {
      <span class="app-list-item__amount"
            [class.app-list-item__amount--expense]="tone() === 'expense'"
            [class.app-list-item__amount--income]="tone() === 'income'">
        {{ value }}
      </span>
    } @else {
      <ng-content select="[slot=trailing]"></ng-content>
    }
  `,
  host: {
    class: 'app-list-item',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListItemComponent {
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly amount = input<string>('');
  readonly tone = input<ListItemTone>('default');
}
