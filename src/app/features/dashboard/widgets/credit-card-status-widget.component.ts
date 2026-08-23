import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BadgeComponent } from '../../../shared/components/badge/badge.component';
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

export type CardPaymentAlert = 'danger' | 'warning' | null;

@Component({
  selector: 'app-credit-card-status-widget',
  imports: [BadgeComponent, CardComponent, ListItemComponent, MexicanCurrencyPipe, RouterLink],
  templateUrl: './credit-card-status-widget.component.html',
  styleUrl: './credit-card-status-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditCardStatusWidgetComponent {
  readonly items = input.required<readonly CreditCardStatusEntry[]>();

  protected subtitleFor(card: CreditCardStatusEntry): string {
    return `Cierre día ${card.statementClosingDay} · Pago ${this.formatDate(card.paymentDueDate)}`;
  }

  protected paymentAlert(card: CreditCardStatusEntry): CardPaymentAlert {
    if (card.amountToPay <= 0 || !card.paymentDueDate) {
      return null;
    }
    const daysUntilDue = this.daysUntil(card.paymentDueDate);
    if (daysUntilDue === 0) {
      return 'danger';
    }
    if (daysUntilDue === 1) {
      return 'warning';
    }
    return null;
  }

  protected alertLabel(alert: CardPaymentAlert): string {
    return alert === 'danger' ? 'Vence hoy' : 'Vence mañana';
  }

  protected alertIcon(alert: CardPaymentAlert): string {
    return alert === 'danger' ? 'warning' : 'schedule';
  }

  private daysUntil(isoDate: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(`${isoDate}T00:00:00`);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  private formatDate(iso: string): string {
    if (!iso) return '—';
    const [, mm, dd] = iso.split('-');
    return `${dd}/${mm}`;
  }
}
