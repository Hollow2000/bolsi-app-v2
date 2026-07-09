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
  templateUrl: './bottom-sheet.component.html',
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
