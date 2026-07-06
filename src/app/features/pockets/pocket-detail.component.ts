import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';

import { database } from '../../core/database/bolsi.database';
import type { Expense } from '../../core/models/expense.model';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import type { Pocket } from '../../core/models/pocket.model';
import { ExpenseService } from '../../core/services/expense.service';
import { IncomeService } from '../../core/services/income.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { PocketService } from '../../core/services/pocket.service';
import { CardComponent } from '../../shared/components/card/card.component';
import { ListItemComponent } from '../../shared/components/list-item/list-item.component';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { MexicanCurrencyPipe } from '../../shared/pipes/mexican-currency.pipe';

@Component({
  selector: 'app-pocket-detail',
  imports: [
    CardComponent,
    ListItemComponent,
    MexicanCurrencyPipe,
    ProgressBarComponent,
    RouterLink,
  ],
  template: `
    @if (pocket(); as p) {
      <div class="app-screen">
        <header class="app-screen-header">
          <a routerLink="/pockets" class="back-link" aria-label="Volver a bolsillos">
            <span class="material-symbols-outlined icon" aria-hidden="true">chevron_left</span>
          </a>
          <h1>
            <span aria-hidden="true">{{ p.emoji }}</span>
            {{ p.name }}
          </h1>
        </header>
        <main class="app-screen-content">
          <app-card title="Resumen del mes">
            <p class="assigned-line">
              <span class="assigned-label">Asignado este mes</span>
              <span class="assigned-value">{{ assigned() | mexicanCurrency }}</span>
            </p>
            <p class="assigned-line">
              <span class="assigned-label">Gastado</span>
              <span class="assigned-value" [class.assigned-value--over]="used() > assigned()">
                {{ used() | mexicanCurrency }}
              </span>
            </p>
            <app-progress-bar [value]="used()" [max]="assigned() || 1" />
            <p class="available-line" [class.available-line--over]="used() > assigned()">
              @if (used() > assigned()) {
                Excedido por {{ used() - assigned() | mexicanCurrency }}
              } @else {
                {{ assigned() - used() | mexicanCurrency }} disponible
              }
            </p>
          </app-card>

          <app-card title="Gastos del bolsillo">
            @if (expenses().length === 0) {
              <p class="empty">Aún no tienes gastos en este bolsillo este mes.</p>
            } @else {
              <ul class="app-list" aria-label="Gastos del bolsillo">
                @for (expense of expenses(); track expense.id) {
                  <li class="app-list-item">
                    <app-list-item
                      icon="shopping_bag"
                      [title]="expense.description"
                      [subtitle]="expense.date + ' · ' + expense.category"
                      [amount]="(expense.amount | mexicanCurrency) ?? ''"
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
          <a routerLink="/pockets" class="back-link" aria-label="Volver a bolsillos">
            <span class="material-symbols-outlined icon" aria-hidden="true">chevron_left</span>
          </a>
          <h1>Bolsillo</h1>
        </header>
        <main class="app-screen-content">
          <app-card title="Sin datos">
            <p class="empty">No se encontró el bolsillo solicitado.</p>
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
      .assigned-line {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin: 0 0 var(--space-1);
        gap: var(--space-3);
      }
      .assigned-line:last-of-type { margin-bottom: var(--space-3); }
      .assigned-label {
        font-size: var(--text-size-small);
        color: var(--text-secondary);
      }
      .assigned-value {
        font-family: var(--font-family-mono);
        font-weight: 600;
        font-size: var(--text-size-base);
        color: var(--text-primary);
      }
      .assigned-value--over { color: var(--color-danger); }
      .available-line {
        margin: var(--space-2) 0 0;
        font-size: var(--text-size-small);
        color: var(--text-secondary);
        text-align: right;
      }
      .available-line--over { color: var(--color-danger); font-weight: 600; }
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
export class PocketDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pocketService = inject(PocketService);
  private readonly expenseService = inject(ExpenseService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly incomeService = inject(IncomeService);

  private readonly pocketId = toSignal(
    this.route.paramMap.pipe(map((params) => Number(params.get('id')) ?? 0)),
    { initialValue: 0 },
  );

  protected readonly pocket = signal<Pocket | null>(null);
  protected readonly expenses = signal<Expense[]>([]);
  protected readonly currentMonth = signal(new Date().getMonth() + 1);
  protected readonly currentYear = signal(new Date().getFullYear());

  protected readonly assigned = computed(() => {
    const p = this.pocket();
    if (!p) return 0;
    const income = this.monthlyIncome();
    return Math.round(income * (p.percentage / 100) * 100) / 100;
  });

  protected readonly used = computed(() =>
    this.expenses().reduce((sum, expense) => sum + expense.amount, 0),
  );

  private monthlyIncome = signal(0);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const id = this.pocketId();
    if (id === 0) {
      return;
    }
    const all = await this.pocketService.getAll();
    const pocket = all.find((p) => p.id === id) ?? null;
    this.pocket.set(pocket);
    if (!pocket) {
      return;
    }
    const month = this.currentMonth();
    const year = this.currentYear();
    const [expenses, incomes] = await Promise.all([
      this.expenseService.getByMonth(month, year),
      this.incomeService.getByMonth(month, year),
    ]);
    this.expenses.set(expenses.filter((expense) => expense.pocketId === id));
    this.monthlyIncome.set(
      incomes
        .filter((income) => income.status === 'received')
        .reduce((sum, income) => sum + income.amount, 0),
    );
  }
}
