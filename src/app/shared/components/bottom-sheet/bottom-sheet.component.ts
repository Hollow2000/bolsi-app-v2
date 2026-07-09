import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, input, output, viewChild } from '@angular/core';

import { IconButtonDirective } from '../icon-button/icon-button.directive';

/**
 * Generic bottom-sheet modal. Project any content; consumers receive
 * a `close` event when the user dismisses the sheet by tapping the
 * overlay or pressing the close button. Renders the global
 * `.app-modal-overlay` / `.app-modal-sheet` styles.
 *
 * Implements focus trapping: Tab cycles within the modal, and focus
 * returns to the previously focused element on close.
 */
@Component({
  selector: 'app-bottom-sheet',
  templateUrl: './bottom-sheet.component.html',
  imports: [IconButtonDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomSheetComponent implements OnInit, OnDestroy {
  readonly title = input<string>('');
  readonly close = output<void>();

  private readonly sheet = viewChild<ElementRef<HTMLElement>>('sheetRef');
  private previousFocus: HTMLElement | null = null;

  ngOnInit(): void {
    this.previousFocus = document.activeElement as HTMLElement;
    setTimeout(() => {
      const sheetEl = this.sheet()?.nativeElement;
      if (sheetEl) {
        const firstFocusable = sheetEl.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        firstFocusable?.focus();
      }
    }, 0);
  }

  ngOnDestroy(): void {
    this.previousFocus?.focus();
  }

  protected onClose(): void {
    this.close.emit();
  }

  protected onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const sheetEl = this.sheet()?.nativeElement;
    if (!sheetEl) return;
    const focusable = sheetEl.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }
}
