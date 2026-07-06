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
  readonly daysUntilClosing: number;
  readonly periodCharges: number;
  readonly statementClosingDay: number;
}

@Component({
  selector: 'app-credit-card-status-widget',
  imports: [CardComponent, ListItemComponent, MexicanCurrencyPipe, RouterLink],
  template: `
    @if (items().length === 0) {
      <app-card title="Tarjetas de crédito">
        <p class="empty-message">No tienes tarjetas de crédito registradas.</p>
      </app-card>
    } @else {
      <app-card title="Tarjetas de crédito">
        <ul class="card-list" aria-label="Estado de tarjetas">
          @for (card of items(); track card.id) {
            <li class="card-row">
              <a class="card-link" [routerLink]="['/credit-cards', card.id]">
                <app-list-item
                  icon="credit_card"
                  [title]="card.name"
                  [subtitle]="subtitleFor(card)"
                  [amount]="(card.availableCredit | mexicanCurrency) ?? ''"
                />
                <div class="card-extra">
                  <span class="card-extra__charges">
                    Cargo del período: {{ card.periodCharges | mexicanCurrency }}
                  </span>
                </div>
              </a>
            </li>
          }
        </ul>
        <a routerLink="/credit-cards" class="see-all">Ver todas las tarjetas</a>
      </app-card>
    }
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
      .card-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        list-style: none;
        margin: 0 0 var(--space-2);
        padding: 0;
      }
      .card-row {
        border: 1px solid var(--border-default);
        border-radius: var(--radius-medium);
        background: var(--surface);
        overflow: hidden;
      }
      .card-link {
        display: block;
        padding: var(--space-3);
        text-decoration: none;
        color: inherit;
      }
      .card-link:hover { background: var(--surface-alternate); }
      .card-extra {
        margin-top: var(--space-1);
        padding-top: var(--space-1);
        border-top: 1px solid var(--border-default);
      }
      .card-extra__charges {
        font-size: var(--text-size-extra-small);
        color: var(--text-secondary);
      }
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
export class CreditCardStatusWidgetComponent {
  readonly items = input.required<readonly CreditCardStatusEntry[]>();

  protected subtitleFor(card: CreditCardStatusEntry): string {
    return `Cierre día ${card.statementClosingDay} · ${card.daysUntilClosing} día(s) al próximo corte`;
  }
}
