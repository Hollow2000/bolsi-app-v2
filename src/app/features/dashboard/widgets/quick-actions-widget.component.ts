import { ChangeDetectionStrategy, Component, output } from '@angular/core';
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
  templateUrl: './quick-actions-widget.component.html',
  styleUrl: './quick-actions-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickActionsWidgetComponent {
  protected readonly actions: readonly QuickAction[] = [
    { path: '/expenses', icon: 'shopping_cart', label: 'Nuevo gasto' },
    { path: '/income', icon: 'trending_up', label: 'Nuevo ingreso' },
    { path: '/credit-cards', icon: 'credit_card', label: 'Ver tarjetas' },
    { path: '/monthly-payments', icon: 'calendar_month', label: 'Ver pagos' },
  ];

  readonly transferPress = output<void>();
}
