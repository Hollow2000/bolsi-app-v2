import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { CardComponent } from '../../../shared/components/card/card.component';
import { ProgressBarComponent } from '../../../shared/components/progress-bar/progress-bar.component';
import { MexicanCurrencyPipe } from '../../../shared/pipes/mexican-currency.pipe';

export interface PocketSummaryEntry {
  readonly id: number;
  readonly name: string;
  readonly icon: string;
  readonly percentage: number;
  readonly assigned: number;
  readonly used: number;
}

@Component({
  selector: 'app-pocket-summary-widget',
  imports: [CardComponent, MexicanCurrencyPipe, ProgressBarComponent],
  templateUrl: './pocket-summary-widget.component.html',
  styleUrl: './pocket-summary-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PocketSummaryWidgetComponent {
  readonly entries = input.required<readonly PocketSummaryEntry[]>();

  protected readonly hasOverflow = computed(() =>
    this.entries().some((pocket) => pocket.used > pocket.assigned),
  );
}
