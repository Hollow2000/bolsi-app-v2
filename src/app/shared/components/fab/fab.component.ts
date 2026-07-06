import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Floating action button anchored above the bottom navigation. Always
 * renders a Material Symbol glyph and an `aria-label` for screen
 * readers.
 */
@Component({
  selector: 'app-fab',
  template: `
    <button
      type="button"
      class="app-floating-action-button"
      [attr.aria-label]="ariaLabel()"
      (click)="press.emit()"
    >
      <span class="material-symbols-outlined icon" aria-hidden="true">{{ icon() }}</span>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FabComponent {
  readonly icon = input<string>('add');
  readonly ariaLabel = input<string>('Acción principal');
  readonly press = output<void>();
}
