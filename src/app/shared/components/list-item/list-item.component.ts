import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ListItemTone = 'default' | 'income' | 'expense';

/**
 * Compact list item. Used by transactions, settings, and any list view
 * with a leading icon, title, subtitle, and trailing amount/action.
 */
@Component({
  selector: 'app-list-item',
  templateUrl: './list-item.component.html',
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
