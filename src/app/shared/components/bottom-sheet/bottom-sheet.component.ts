import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IconButtonDirective } from '../icon-button/icon-button.directive';

/**
 * Generic bottom-sheet modal. Project any content; consumers receive
 * a `close` event when the user dismisses the sheet by tapping the
 * overlay or pressing the close button. Renders the global
 * `.app-modal-overlay` / `.app-modal-sheet` styles.
 */
@Component({
  selector: 'app-bottom-sheet',
  template: `
    <div class="app-modal-overlay" (click)="onClose()">
      <div
        class="app-modal-sheet"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title() || null"
        (click)="$event.stopPropagation()"
      >
        <div class="app-modal-handle" aria-hidden="true"></div>
        <header class="app-modal-header">
          @if (title()) {
            <h2 class="app-modal-title">{{ title() }}</h2>
          }
          <button
            appIconButton
            type="button"
            aria-label="Cerrar"
            (click)="onClose()"
          >
            <span class="material-symbols-outlined icon" aria-hidden="true">close</span>
          </button>
        </header>
        <div class="app-modal-body">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
  imports: [IconButtonDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomSheetComponent {
  readonly title = input<string>('');
  readonly close = output<void>();

  protected onClose(): void {
    this.close.emit();
  }
}
