import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { MonthlyPayment } from '../../../core/models/monthly-payment.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { CardComponent } from '../../../shared/components/card/card.component';
import { ListItemComponent } from '../../../shared/components/list-item/list-item.component';
import { MexicanCurrencyPipe } from '../../../shared/pipes/mexican-currency.pipe';

export interface UrgentPayment {
  readonly id: number;
  readonly name: string;
  readonly amount: number;
  readonly dueDate: string;
  readonly daysUntilDue: number;
  readonly urgency: 'overdue' | 'soon' | 'this-week';
}

@Component({
  selector: 'app-urgent-payments-widget',
  imports: [CardComponent, ListItemComponent, MexicanCurrencyPipe, RouterLink],
  template: `
    <app-card title="Pagos urgentes">
      @if (items().length === 0) {
        <p class="empty-message">No tienes pagos urgentes este mes. 🎉</p>
      } @else {
        <ul class="app-list" aria-label="Pagos urgentes">
          @for (payment of items(); track payment.id) {
            <li class="urgent-row" [attr.data-urgency]="payment.urgency">
              <app-list-item
                [icon]="iconFor(payment)"
                [title]="payment.name"
                [subtitle]="subtitleFor(payment)"
                [amount]="(payment.amount | mexicanCurrency) ?? ''"
                tone="expense"
              />
            </li>
          }
        </ul>
        <a routerLink="/monthly-payments" class="see-all">Ver todos los pagos</a>
      }
    </app-card>
  `,
  styles: [
    `
      :host { display: block; }
      .empty-message {
        margin: 0;
        color: var(--text-secondary);
        text-align: center;
        padding: var(--space-2) 0;
      }
      .urgent-row[data-urgency='overdue'] { background: var(--color-danger-subtle); }
      .urgent-row[data-urgency='soon'] { background: var(--color-warning-subtle); }
      .see-all {
        display: block;
        text-align: center;
        margin-top: var(--space-3);
        font-size: var(--text-size-small);
        color: var(--color-primary);
        text-decoration: none;
        font-weight: 500;
      }
      .see-all:hover { text-decoration: underline; }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UrgentPaymentsWidgetComponent {
  readonly payments = input<readonly MonthlyPayment[]>([]);

  protected readonly items = computed<UrgentPayment[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const items: UrgentPayment[] = [];
    for (const payment of this.payments()) {
      if (payment.paid) continue;
      const due = new Date(`${payment.dueDate}T00:00:00`);
      const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      let urgency: UrgentPayment['urgency'] | null = null;
      if (diff < 0) urgency = 'overdue';
      else if (diff <= 3) urgency = 'soon';
      else if (diff <= 7) urgency = 'this-week';
      if (urgency && payment.id !== undefined) {
        items.push({
          id: payment.id,
          name: payment.name,
          amount: payment.amount,
          dueDate: payment.dueDate,
          daysUntilDue: diff,
          urgency,
        });
      }
    }
    items.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
    return items.slice(0, 5);
  });

  protected iconFor(payment: UrgentPayment): string {
    if (payment.urgency === 'overdue') return 'warning';
    if (payment.urgency === 'soon') return 'schedule';
    return 'event';
  }

  protected subtitleFor(payment: UrgentPayment): string {
    if (payment.urgency === 'overdue') {
      return `Vencido hace ${Math.abs(payment.daysUntilDue)} día(s)`;
    }
    if (payment.daysUntilDue === 0) return 'Vence hoy';
    return `Vence en ${payment.daysUntilDue} día(s)`;
  }
}
