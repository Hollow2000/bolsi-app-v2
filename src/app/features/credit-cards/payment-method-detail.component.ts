import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import type { Expense } from '../../core/models/expense.model';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import { ExpenseService } from '../../core/services/expense.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { CardComponent } from '../../shared/components/card/card.component';
import { ListItemComponent } from '../../shared/components/list-item/list-item.component';
import { MexicanCurrencyPipe, formatMexicanCurrency } from '../../shared/pipes/mexican-currency.pipe';
import { ToastService } from '../../shared/services/toast.service';
import { InstallPromptComponent } from '../../shared/components/install-prompt/install-prompt.component';

@Component({
  selector: 'app-payment-method-detail',
  imports: [CardComponent, InstallPromptComponent, ListItemComponent, MexicanCurrencyPipe, RouterLink],
  templateUrl: './payment-method-detail.component.html',
  styleUrl: './payment-method-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentMethodDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly expenseService = inject(ExpenseService);

  private readonly methodId = Number(this.route.snapshot.paramMap.get('id')) || 0;

  protected readonly method = signal<PaymentMethod | null>(null);
  protected readonly expenses = signal<Expense[]>([]);

  protected readonly currentMonth = new Date().getMonth() + 1;
  protected readonly currentYear = new Date().getFullYear();

  constructor() {
    void this.load();
  }

  protected typeLabel(type: PaymentMethod['type']): string {
    if (type === 'cash') return 'Efectivo';
    if (type === 'debit') return 'Débito';
    return 'Crédito';
  }

  protected format(amount: number): string {
    return formatMexicanCurrency(amount);
  }

  private async load(): Promise<void> {
    const method = await this.paymentMethodService.getById(this.methodId);
    this.method.set(method ?? null);
    if (method) {
      const all = await this.expenseService.getByMonth(this.currentMonth, this.currentYear);
      this.expenses.set(all.filter((e) => e.paymentMethodId === method.id));
    }
  }
}
