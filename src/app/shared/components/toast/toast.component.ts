import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Toast/snackbar — renders a single transient message at the bottom of
 * the screen, above the bottom navigation. Caller controls visibility.
 */
@Component({
  selector: 'app-toast',
  template: `<ng-content></ng-content>`,
  host: {
    class: 'app-toast',
    role: 'status',
    'aria-live': 'polite',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  readonly visible = input<boolean>(true);
}
