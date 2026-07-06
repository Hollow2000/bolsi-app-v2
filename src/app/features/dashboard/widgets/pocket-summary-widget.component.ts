import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { CardComponent } from '../../../shared/components/card/card.component';
import { ProgressBarComponent } from '../../../shared/components/progress-bar/progress-bar.component';
import { MexicanCurrencyPipe } from '../../../shared/pipes/mexican-currency.pipe';

export interface PocketSummaryEntry {
  readonly id: number;
  readonly name: string;
  readonly emoji: string;
  readonly percentage: number;
  readonly assigned: number;
  readonly used: number;
}

@Component({
  selector: 'app-pocket-summary-widget',
  imports: [CardComponent, MexicanCurrencyPipe, ProgressBarComponent],
  template: `
    @if (entries().length === 0) {
      <app-card title="Bolsillos">
        <p class="empty-message">No tienes bolsillos configurados.</p>
      </app-card>
    } @else {
      <app-card title="Bolsillos del mes">
        <ul class="pocket-list" aria-label="Estado de los bolsillos">
          @for (pocket of entries(); track pocket.id) {
            <li class="pocket-summary">
              <div class="pocket-summary__head">
                <span class="pocket-summary__name">
                  <span aria-hidden="true">{{ pocket.emoji }}</span>
                  {{ pocket.name }}
                </span>
                <span class="pocket-summary__percent">{{ pocket.percentage }}%</span>
              </div>
              <app-progress-bar [value]="pocket.used" [max]="pocket.assigned || 1" />
              <p class="pocket-summary__numbers">
                <span>{{ pocket.used | mexicanCurrency }} de {{ pocket.assigned | mexicanCurrency }}</span>
                <span [class.pocket-summary__available--over]="pocket.used > pocket.assigned">
                  {{ (pocket.assigned - pocket.used) | mexicanCurrency }} libre
                </span>
              </p>
            </li>
          }
        </ul>
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
      .pocket-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .pocket-summary {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
      }
      .pocket-summary__head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: var(--space-2);
      }
      .pocket-summary__name {
        font-size: var(--text-size-base);
        font-weight: 500;
        color: var(--text-primary);
      }
      .pocket-summary__percent {
        font-size: var(--text-size-small);
        color: var(--text-secondary);
        font-family: var(--font-family-mono);
      }
      .pocket-summary__numbers {
        display: flex;
        justify-content: space-between;
        font-size: var(--text-size-extra-small);
        color: var(--text-secondary);
        margin: 0;
      }
      .pocket-summary__available--over { color: var(--color-danger); }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PocketSummaryWidgetComponent {
  readonly entries = input.required<readonly PocketSummaryEntry[]>();

  protected readonly hasOverflow = computed(() =>
    this.entries().some((pocket) => pocket.used > pocket.assigned),
  );
}
