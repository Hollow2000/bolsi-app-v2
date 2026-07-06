import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'primary';

/**
 * Pill badge for status indicators. Always pairs an icon with text and
 * exposes the right ARIA role.
 *
 * Usage:
 *   <app-badge tone="success" icon="check_circle">Pagado</app-badge>
 */
@Component({
  selector: 'app-badge',
  template: `
    @if (icon()) {
      <span class="material-symbols-outlined icon icon--small" aria-hidden="true">{{ icon() }}</span>
    }
    <span>{{ label() }}</span>
  `,
  host: {
    class: 'app-badge',
    '[class.app-badge--success]': 'tone() === "success"',
    '[class.app-badge--warning]': 'tone() === "warning"',
    '[class.app-badge--danger]': 'tone() === "danger"',
    '[class.app-badge--neutral]': 'tone() === "neutral"',
    '[class.app-badge--primary]': 'tone() === "primary"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  readonly label = input.required<string>();
  readonly tone = input<BadgeTone>('neutral');
  readonly icon = input<string>('');
}
