import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

let selectInputIdCounter = 0;
function nextSelectInputId(): string {
  selectInputIdCounter += 1;
  return `app-select-input-${selectInputIdCounter}`;
}

/**
 * Native <select> wrapped with the design-system label and error
 * message. Options are projected by the parent so complex `<option>`
 * values (e.g. `[ngValue]`) keep working.
 *
 * Usage:
 *   <app-select-input label="Método de pago" [(value)]="paymentMethodId">
 *     <option [ngValue]="0" disabled>Selecciona…</option>
 *     <option [ngValue]="1">BBVA</option>
 *   </app-select-input>
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
      [value]="value() === null || value() === undefined ? '' : value()"
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

  protected onChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (this.valueType() === 'number') {
      this.value.set(Number(target.value));
    } else {
      this.value.set(target.value);
    }
  }
}
