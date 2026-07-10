import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { ExpenseTemplate } from '../../../core/models/expense-template.model';
import type { PaymentMethod } from '../../../core/models/payment-method.model';
import type { Pocket } from '../../../core/models/pocket.model';
import { ButtonDirective } from '../button/button.directive';
import { ListItemComponent } from '../list-item/list-item.component';
import { MexicanCurrencyPipe } from '../../pipes/mexican-currency.pipe';

@Component({
  selector: 'app-template-selector',
  imports: [ButtonDirective, ListItemComponent, MexicanCurrencyPipe],
  templateUrl: './template-selector.component.html',
  styleUrl: './template-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateSelectorComponent {
  readonly templates = input.required<readonly ExpenseTemplate[]>();
  readonly paymentMethods = input.required<readonly PaymentMethod[]>();
  readonly pockets = input.required<readonly Pocket[]>();
  readonly selected = output<ExpenseTemplate>();

  protected methodName(id: number): string {
    return this.paymentMethods().find((m) => m.id === id)?.name ?? '—';
  }

  protected pocketName(id: number): string {
    return this.pockets().find((p) => p.id === id)?.name ?? '—';
  }
}
