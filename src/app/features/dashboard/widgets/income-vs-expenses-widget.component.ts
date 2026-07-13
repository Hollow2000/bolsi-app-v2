import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { CardComponent } from '../../../shared/components/card/card.component';
import { MexicanCurrencyPipe } from '../../../shared/pipes/mexican-currency.pipe';

export interface IncomeVsExpenses {
  readonly receivedIncome: number;
  readonly pendingIncome: number;
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

  protected readonly totalIncome = computed(() => this.data().receivedIncome + this.data().pendingIncome);

  protected readonly net = computed(() => this.totalIncome() - this.data().expenses);

  protected readonly max = computed(() => Math.max(this.totalIncome(), this.data().expenses, 1));

  protected readonly receivedPercent = computed(() => (this.data().receivedIncome / this.max()) * 100);

  protected readonly pendingPercent = computed(() => (this.data().pendingIncome / this.max()) * 100);

  protected readonly incomePercent = computed(() => ((this.data().receivedIncome + this.data().pendingIncome) / this.max()) * 100);

  protected readonly expensePercent = computed(() => (this.data().expenses / this.max()) * 100);
}
