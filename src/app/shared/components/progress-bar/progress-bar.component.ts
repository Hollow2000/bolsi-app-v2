import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Linear progress bar. The `value` is the current usage; the `max` is
 * the cap. The fill class switches to `warning` at 80%+ and `danger`
 * at 100%+, but only when `autoTone` is true.
 *
 * Usage:
 *   <app-progress-bar [value]="used" [max]="assigned" />
 */
@Component({
  selector: 'app-progress-bar',
  template: `
    <div class="app-progress" role="progressbar"
         [attr.aria-valuenow]="value()"
         [attr.aria-valuemin]="0"
         [attr.aria-valuemax]="max()"
         [attr.aria-label]="ariaLabel() || null">
      <div class="app-progress__fill"
           [class.app-progress__fill--warning]="tone() === 'warning'"
           [class.app-progress__fill--danger]="tone() === 'danger'"
           [style.width.%]="percentage()"></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressBarComponent {
  readonly value = input.required<number>();
  readonly max = input<number>(100);
  readonly autoTone = input<boolean>(true);
  readonly ariaLabel = input<string>('');

  protected readonly percentage = computed(() => {
    const max = this.max();
    if (max <= 0) {
      return 0;
    }
    return Math.min(100, (this.value() / max) * 100);
  });

  protected readonly tone = computed<'normal' | 'warning' | 'danger'>(() => {
    if (!this.autoTone()) {
      return 'normal';
    }
    const max = this.max();
    if (max <= 0) {
      return 'normal';
    }
    const ratio = this.value() / max;
    if (ratio >= 1) {
      return 'danger';
    }
    if (ratio >= 0.8) {
      return 'warning';
    }
    return 'normal';
  });
}
