import { Directive, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

/**
 * Apply Bolsi App button styles to any <button> or <a> element.
 * Host bindings add the global `.app-button` class plus the right variant.
 *
 * Usage:
 *   <button appButton variant="primary" (click)="...">Guardar</button>
 *   <a appButton variant="secondary" routerLink="/back">Atrás</a>
 */
@Directive({
  selector: 'button[appButton], a[appButton]',
  host: {
    class: 'app-button',
    '[class.app-button--primary]': 'variant() === "primary"',
    '[class.app-button--secondary]': 'variant() === "secondary"',
    '[class.app-button--ghost]': 'variant() === "ghost"',
    '[class.app-button--destructive]': 'variant() === "destructive"',
  },
})
export class ButtonDirective {
  readonly variant = input<ButtonVariant>('primary');
}
