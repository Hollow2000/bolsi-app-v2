import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Bolsi App card surface. Wraps any content with the standard card
 * background, border, and shadow. Set `interactive` for clickable
 * cards (hover state, pointer cursor).
 *
 * Usage:
 *   <app-card title="Resumen">…</app-card>
 *   <app-card interactive (click)="...">…</app-card>
 */
@Component({
  selector: 'app-card',
  template: `
    @if (title()) {
      <h2 class="app-card__title">{{ title() }}</h2>
    }
    <ng-content></ng-content>
  `,
  host: {
    class: 'app-card',
    '[class.app-card--interactive]': 'interactive()',
    '[attr.role]': 'interactive() ? "button" : null',
    '[attr.tabindex]': 'interactive() ? "0" : null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  readonly title = input<string>('');
  readonly interactive = input<boolean>(false);
}
