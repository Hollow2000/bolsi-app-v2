import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { CardComponent } from '../../../shared/components/card/card.component';
import { ProgressBarComponent } from '../../../shared/components/progress-bar/progress-bar.component';
import { MexicanCurrencyPipe } from '../../../shared/pipes/mexican-currency.pipe';

export interface BudgetUsageEntry {
  readonly id: number;
  readonly category: string;
  readonly estimatedAmount: number;
  readonly actual: number;
  readonly ratio: number;
  readonly pocketName: string;
}

@Component({
  selector: 'app-budget-usage-widget',
  imports: [CardComponent, MexicanCurrencyPipe, ProgressBarComponent],
  templateUrl: './budget-usage-widget.component.html',
  styleUrl: './budget-usage-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetUsageWidgetComponent {
  readonly entries = input.required<readonly BudgetUsageEntry[]>();
}
