import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

let numberInputIdCounter = 0;
function nextNumberInputId(): string {
  numberInputIdCounter += 1;
  return `app-number-input-${numberInputIdCounter}`;
}

/**
 * Number input with label and inline validation. Always shows the
 * placeholder when the value is 0 (or below the minimum), so the user
 * never starts editing a "0" they have to delete first.
 *
 * Usage:
 *   <app-number-input label="Saldo actual"
 *                      [(value)]="paymentMethodDraft.currentBalance"
 *                      placeholder="0.00" />
 */
@Component({
  selector: 'app-number-input',
  template: `
    <label class="app-form-field__label"
           [class.app-form-field__label--required]="required()"
           [attr.for]="fieldId()">
      {{ label() }}
    </label>
    <input
      [id]="fieldId()"
      type="number"
      inputmode="decimal"
      class="app-form-input"
      [class.app-form-input--error]="!!error()"
      [placeholder]="placeholder()"
      [value]="displayValue()"
      [min]="min() ?? null"
      [max]="max() ?? null"
      [step]="step()"
      [disabled]="disabled()"
      (input)="onInput($event)"
    />
    @if (error(); as message) {
      <p class="app-form-field__error" role="alert">{{ message }}</p>
    }
  `,
  host: {
    class: 'app-form-field',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NumberInputComponent {
  readonly label = input<string>('');
  readonly value = model<number>(0);
  readonly placeholder = input<string>('0.00');
  readonly disabled = input<boolean>(false);
  readonly required = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly min = input<number | null>(null);
  readonly max = input<number | null>(null);
  readonly step = input<number>(0.01);
  readonly fieldId = input<string>(nextNumberInputId());

  protected readonly displayValue = computed(() => {
    const current = this.value();
    if (current === 0) {
      return '';
    }
    return String(current);
  });

  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.value === '') {
      this.value.set(0);
      return;
    }
    const numeric = Number(target.value);
    this.value.set(Number.isFinite(numeric) ? numeric : 0);
  }
}
