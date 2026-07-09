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
  templateUrl: './income-vs-expenses-widget.component.html',
  styleUrl: './income-vs-expenses-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeVsExpensesWidgetComponent {
  readonly data = input.required<IncomeVsExpenses>();

  protected readonly net = computed(() => this.data().income - this.data().expenses);

  protected readonly max = computed(() => Math.max(this.data().income, this.data().expenses, 1));

  protected readonly incomePercent = computed(() => (this.data().income / this.max()) * 100);

  protected readonly expensePercent = computed(() => (this.data().expenses / this.max()) * 100);
}
