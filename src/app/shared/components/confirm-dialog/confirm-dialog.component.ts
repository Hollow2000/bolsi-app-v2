import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ButtonDirective } from '../button/button.directive';

@Component({
  selector: 'app-confirm-dialog',
  imports: [ButtonDirective],
  template: `
    <p class="confirm-message">{{ message() }}</p>
    <div class="confirm-actions">
      <button appButton variant="secondary" type="button" (click)="cancelled.emit()">
        {{ cancelLabel() }}
      </button>
      <button appButton [variant]="confirmTone()" type="button" (click)="confirmed.emit()">
        {{ confirmLabel() }}
      </button>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    .confirm-message {
      margin: 0;
      font-size: var(--text-size-base);
      color: var(--text-primary);
    }
    .confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-2);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  readonly confirmTone = input<'primary' | 'destructive'>('destructive');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
