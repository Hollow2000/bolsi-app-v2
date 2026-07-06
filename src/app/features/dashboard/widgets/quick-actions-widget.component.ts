import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CardComponent } from '../../../shared/components/card/card.component';

interface QuickAction {
  readonly path: string;
  readonly icon: string;
  readonly label: string;
}

@Component({
  selector: 'app-quick-actions-widget',
  imports: [CardComponent, RouterLink],
  template: `
    <app-card title="Acciones rápidas">
      <ul class="quick-grid" aria-label="Acciones rápidas">
        @for (action of actions; track action.path) {
          <li>
            <a class="quick-link" [routerLink]="action.path">
              <span class="material-symbols-outlined icon" aria-hidden="true">{{ action.icon }}</span>
              <span class="quick-link__label">{{ action.label }}</span>
            </a>
          </li>
        }
      </ul>
    </app-card>
  `,
  styles: [
    `
      :host { display: block; }
      .quick-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-2);
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .quick-link {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--space-1);
        padding: var(--space-3);
        border-radius: var(--radius-medium);
        background: var(--surface-alternate);
        color: var(--color-primary);
        text-decoration: none;
        min-height: 64px;
        font-size: var(--text-size-small);
        font-weight: 500;
        transition: background 0.15s ease;
      }
      .quick-link:hover { background: var(--color-primary-muted); }
      .quick-link__label { color: var(--text-primary); }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickActionsWidgetComponent {
  protected readonly actions: readonly QuickAction[] = [
    { path: '/expenses', icon: 'shopping_cart', label: 'Nuevo gasto' },
    { path: '/income', icon: 'trending_up', label: 'Nuevo ingreso' },
    { path: '/credit-cards', icon: 'credit_card', label: 'Ver tarjetas' },
    { path: '/monthly-payments', icon: 'calendar_month', label: 'Ver pagos' },
  ];
}
