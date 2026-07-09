import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

let dateInputIdCounter = 0;
function nextDateInputId(): string {
  dateInputIdCounter += 1;
  return `app-date-input-${dateInputIdCounter}`;
}

/**
 * Native <input type="date"> wrapped with the design-system label and
 * error message. Stores the value as an ISO `YYYY-MM-DD` string.
 *
 * Usage:
 *   <app-date-input label="Fecha" [(value)]="income.date" />
 */
@Component({
  selector: 'app-date-input',
  templateUrl: './date-input.component.html',
  host: {
    class: 'app-form-field',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateInputComponent {
  readonly label = input<string>('');
  readonly value = model<string>('');
  readonly disabled = input<boolean>(false);
  readonly required = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly min = input<string>('');
  readonly max = input<string>('');
  readonly fieldId = input<string>(nextDateInputId());

  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value);
  }
}
