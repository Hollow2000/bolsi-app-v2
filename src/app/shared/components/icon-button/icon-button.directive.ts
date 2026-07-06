import { Directive, input } from '@angular/core';

/**
 * Apply Bolsi App icon-only button styles. Enforces a 44×44px tap target
 * and a neutral ghost color. Pair with a Material Symbol span and an
 * `aria-label` for accessibility.
 *
 * Usage:
 *   <button appIconButton type="button" aria-label="Eliminar"
 *           (click)="remove()">
 *     <span class="material-symbols-outlined icon icon--small" aria-hidden="true">delete</span>
 *   </button>
 */
@Directive({
  selector: 'button[appIconButton], a[appIconButton]',
  host: {
    class: 'app-icon-button',
  },
})
export class IconButtonDirective {
  readonly variant = input<'neutral' | 'danger'>('neutral');
}
