import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { PaymentMethod } from '../../../core/models/payment-method.model';
import { CardComponent } from '../../../shared/components/card/card.component';
import { ListItemComponent } from '../../../shared/components/list-item/list-item.component';
import { MexicanCurrencyPipe } from '../../../shared/pipes/mexican-currency.pipe';

export interface CreditCardStatusEntry {
  readonly id: number;
  readonly name: string;
  readonly availableCredit: number;
  readonly paymentDueDate: string;
  readonly periodCharges: number;
  readonly statementClosingDay: number;
  readonly amountToPay: number;
}

@Component({
  selector: 'app-credit-card-status-widget',
  imports: [CardComponent, ListItemComponent, MexicanCurrencyPipe, RouterLink],
  templateUrl: './credit-card-status-widget.component.html',
  styleUrl: './credit-card-status-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditCardStatusWidgetComponent {
  readonly items = input.required<readonly CreditCardStatusEntry[]>();

  protected subtitleFor(card: CreditCardStatusEntry): string {
    return `Cierre día ${card.statementClosingDay} · Pago ${card.paymentDueDate}`;
  }
}
