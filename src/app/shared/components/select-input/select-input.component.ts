import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

let selectInputIdCounter = 0;
function nextSelectInputId(): string {
  selectInputIdCounter += 1;
  return `app-select-input-${selectInputIdCounter}`;
}

/**
 * Native <select> wrapped with the design-system label and error
 * message. Options are projected by the parent.
 *
 * Usage:
 *   <app-select-input label="Método de pago"
 *                      [valueType]="'number'"
 *                      [value]="paymentMethodId"
 *                      (valueChange)="onPaymentMethodIdChange($event)">
 *     <option value="0" disabled [selected]="paymentMethodId === 0">…</option>
 *     <option [value]="1" [selected]="paymentMethodId === 1">BBVA</option>
 *   </app-select-input>
 *
 * Important: parents must set `[selected]` on each `<option>` that
 * matches the current value. Relying on `[value]` on the `<select>`
 * alone is unreliable: Angular evaluates that binding before the
 * projected options are in the DOM, so the browser never finds a
 * match and the select appears empty.
 */
@Component({
  selector: 'app-select-input',
  template: `
    <label class="app-form-field__label"
           [class.app-form-field__label--required]="required()"
           [attr.for]="fieldId()">
      {{ label() }}
    </label>
    <select
      [id]="fieldId()"
      class="app-form-input"
      [class.app-form-input--error]="!!error()"
      [disabled]="disabled()"
      [value]="stringValue()"
      (change)="onChange($event)"
    >
      <ng-content></ng-content>
    </select>
    @if (error(); as message) {
      <p class="app-form-field__error" role="alert">{{ message }}</p>
    }
  `,
  host: {
    class: 'app-form-field',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectInputComponent {
  readonly label = input<string>('');
  readonly value = model<number | string | null>('');
  readonly disabled = input<boolean>(false);
  readonly required = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly valueType = input<'number' | 'string'>('string');
  readonly fieldId = input<string>(nextSelectInputId());

  protected readonly stringValue = computed(() => {
    const current = this.value();
    if (current === null || current === undefined) {
      return '';
    }
    return String(current);
  });

  protected onChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const raw = target.value;
    if (this.valueType() === 'number') {
      const numeric = Number(raw);
      this.value.set(Number.isFinite(numeric) ? numeric : 0);
    } else {
      this.value.set(raw);
    }
  }
}
