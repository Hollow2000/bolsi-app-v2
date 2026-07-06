import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { CardComponent } from '../../../shared/components/card/card.component';
import { MexicanCurrencyPipe } from '../../../shared/pipes/mexican-currency.pipe';

export interface IncomeVsExpenses {
  readonly income: number;
  readonly expenses: number;
}

@Component({
  selector: 'app-income-vs-expenses-widget',
  imports: [CardComponent, MexicanCurrencyPipe],
  template: `
    <app-card title="Ingresos vs gastos del mes">
      <p class="ie-line">
        <span class="ie-label">Ingresos recibidos</span>
        <span class="ie-value ie-value--success">+{{ data().income | mexicanCurrency }}</span>
      </p>
      <p class="ie-line">
        <span class="ie-label">Gastos del mes</span>
        <span class="ie-value ie-value--expense">−{{ data().expenses | mexicanCurrency }}</span>
      </p>
      <p class="ie-net" [class.ie-net--negative]="net() < 0">
        <span class="ie-label">Balance</span>
        <span class="ie-value">{{ net() | mexicanCurrency }}</span>
      </p>
      <div class="ie-bars" aria-hidden="true">
        <div class="ie-bars__row">
          <span class="ie-bars__label">Ingresos</span>
          <div class="ie-bars__track">
            <div class="ie-bars__fill ie-bars__fill--success" [style.width.%]="incomePercent()"></div>
          </div>
        </div>
        <div class="ie-bars__row">
          <span class="ie-bars__label">Gastos</span>
          <div class="ie-bars__track">
            <div class="ie-bars__fill ie-bars__fill--expense" [style.width.%]="expensePercent()"></div>
          </div>
        </div>
      </div>
    </app-card>
  `,
  styles: [
    `
      :host { display: block; }
      .ie-line,
      .ie-net {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: var(--space-3);
        margin: 0 0 var(--space-1);
      }
      .ie-net {
        padding-top: var(--space-2);
        border-top: 1px solid var(--border-default);
        margin-top: var(--space-2);
        margin-bottom: var(--space-3);
      }
      .ie-net--negative .ie-value { color: var(--color-danger); }
      .ie-label {
        font-size: var(--text-size-small);
        color: var(--text-secondary);
      }
      .ie-net .ie-label {
        color: var(--text-primary);
        font-weight: 600;
      }
      .ie-value {
        font-family: var(--font-family-mono);
        font-weight: 600;
        color: var(--text-primary);
      }
      .ie-value--success { color: var(--color-success); }
      .ie-value--expense { color: var(--text-primary); }
      .ie-bars {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .ie-bars__row {
        display: grid;
        grid-template-columns: 80px 1fr;
        align-items: center;
        gap: var(--space-2);
      }
      .ie-bars__label {
        font-size: var(--text-size-extra-small);
        color: var(--text-secondary);
      }
      .ie-bars__track {
        height: 8px;
        background: var(--surface-alternate);
        border-radius: var(--radius-full);
        overflow: hidden;
      }
      .ie-bars__fill {
        height: 100%;
        border-radius: var(--radius-full);
        transition: width 0.3s ease;
      }
      .ie-bars__fill--success { background: var(--color-success); }
      .ie-bars__fill--expense { background: var(--color-primary); }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeVsExpensesWidgetComponent {
  readonly data = input.required<IncomeVsExpenses>();

  protected readonly net = computed(() => this.data().income - this.data().expenses);

  protected readonly max = computed(() => Math.max(this.data().income, this.data().expenses, 1));

  protected readonly incomePercent = computed(() => (this.data().income / this.max()) * 100);

  protected readonly expensePercent = computed(() => (this.data().expenses / this.max()) * 100);
}
