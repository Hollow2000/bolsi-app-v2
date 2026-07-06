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

@Component({
  selector: 'app-payment-method-detail',
  imports: [CardComponent, ListItemComponent, MexicanCurrencyPipe, RouterLink],
  template: `
    @if (method(); as m) {
      <div class="app-screen">
        <header class="app-screen-header">
          <a routerLink="/credit-cards" class="back-link" aria-label="Volver a métodos de pago">
            <span class="material-symbols-outlined icon" aria-hidden="true">chevron_left</span>
          </a>
          <h1>{{ m.name }}</h1>
        </header>
        <main class="app-screen-content">
          <app-card title="Resumen">
            <p class="detail-line">
              <span class="detail-label">Tipo</span>
              <span class="detail-value">{{ typeLabel(m.type) }}</span>
            </p>
            @if (m.type === 'credit') {
              <p class="detail-line">
                <span class="detail-label">Crédito disponible</span>
                <span class="detail-value">{{ m.availableCredit ?? 0 | mexicanCurrency }}</span>
              </p>
              <p class="detail-line">
                <span class="detail-label">Límite</span>
                <span class="detail-value">{{ m.creditLimit ?? 0 | mexicanCurrency }}</span>
              </p>
              <p class="detail-line">
                <span class="detail-label">Día de corte</span>
                <span class="detail-value">{{ m.statementClosingDay }}</span>
              </p>
              <p class="detail-line">
                <span class="detail-label">Días de crédito</span>
                <span class="detail-value">{{ m.creditDays }}</span>
              </p>
            } @else {
              <p class="detail-line">
                <span class="detail-label">Saldo actual</span>
                <span class="detail-value">{{ m.currentBalance ?? 0 | mexicanCurrency }}</span>
              </p>
            }
          </app-card>

          <app-card title="Gastos recientes">
            @if (expenses().length === 0) {
              <p class="empty">Sin gastos registrados este mes.</p>
            } @else {
              <ul class="app-list" aria-label="Gastos recientes">
                @for (expense of expenses(); track expense.id) {
                  <li>
                    <app-list-item
                      icon="shopping_bag"
                      [title]="expense.description"
                      [subtitle]="expense.date + ' · ' + expense.category"
                      [amount]="format(expense.amount)"
                      tone="expense"
                    />
                  </li>
                }
              </ul>
            }
          </app-card>
        </main>
      </div>
    } @else {
      <div class="app-screen">
        <header class="app-screen-header">
          <a routerLink="/credit-cards" class="back-link" aria-label="Volver">
            <span class="material-symbols-outlined icon" aria-hidden="true">chevron_left</span>
          </a>
          <h1>Método de pago</h1>
        </header>
        <main class="app-screen-content">
          <app-card title="Sin datos">
            <p class="empty">No se encontró el método de pago.</p>
          </app-card>
        </main>
      </div>
    }
  `,
  styles: [
    `
      :host { display: block; }
      .back-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        margin-left: calc(-1 * var(--space-2));
        color: var(--text-primary);
        text-decoration: none;
      }
      .detail-line {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin: 0 0 var(--space-2);
        gap: var(--space-3);
      }
      .detail-line:last-child { margin-bottom: 0; }
      .detail-label {
        font-size: var(--text-size-small);
        color: var(--text-secondary);
      }
      .detail-value {
        font-size: var(--text-size-base);
        font-weight: 600;
        font-family: var(--font-family-mono);
        color: var(--text-primary);
      }
      .empty {
        margin: 0;
        color: var(--text-secondary);
        text-align: center;
        padding: var(--space-2) 0;
      }
    `,
  ],
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
