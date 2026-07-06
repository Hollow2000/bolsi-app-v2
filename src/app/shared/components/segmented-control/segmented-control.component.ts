import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface SegmentedOption<T extends string | number> {
  readonly value: T;
  readonly label: string;
}

/**
 * Segmented control (radio group styled as a single pill). Always one
 * option is selected; the value is bound as a required input and the
 * parent listens for the change event.
 *
 * Usage:
 *   <app-segmented-control
 *     ariaLabel="Tipo de método de pago"
 *     [options]="typeOptions()"
 *     [value]="paymentMethodDraft().type"
 *     (valueChange)="onTypeChange($event)" />
 */
@Component({
  selector: 'app-segmented-control',
  template: `
    <div class="app-segmented" role="radiogroup" [attr.aria-label]="ariaLabel()">
      @for (option of options(); track option.value) {
        <button
          type="button"
          role="radio"
          class="app-segmented__option"
          [class.app-segmented__option--active]="value() === option.value"
          [attr.aria-checked]="value() === option.value"
          (click)="valueChange.emit(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegmentedControlComponent<T extends string | number> {
  readonly options = input.required<readonly SegmentedOption<T>[]>();
  readonly value = input.required<T>();
  readonly valueChange = output<T>();
  readonly ariaLabel = input<string>('');
}
