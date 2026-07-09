import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

let textInputIdCounter = 0;
function nextTextInputId(): string {
  textInputIdCounter += 1;
  return `app-text-input-${textInputIdCounter}`;
}

/**
 * Text input with label and inline validation message. Renders the global
 * `.app-form-field` block so the input always matches the design system.
 *
 * Usage:
 *   <app-text-input label="Tu nombre" [(value)]="userName" placeholder="Ej. María" />
 */
@Component({
  selector: 'app-text-input',
  templateUrl: './text-input.component.html',
  host: {
    class: 'app-form-field',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextInputComponent {
  readonly label = input<string>('');
  readonly value = model<string>('');
  readonly placeholder = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly required = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly autocomplete = input<string>('off');
  readonly inputmode = input<'' | 'text' | 'email' | 'tel' | 'url' | 'numeric' | 'decimal' | 'search'>('');
  readonly fieldId = input<string>(nextTextInputId());

  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value);
  }
}
