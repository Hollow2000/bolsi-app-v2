import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { MonthlyBalance } from '../../core/models/monthly-balance.model';
import { BalanceService } from '../../core/services/balance.service';
import { SettingsService } from '../../core/services/settings.service';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { CardComponent } from '../../shared/components/card/card.component';
import { MexicanCurrencyPipe } from '../../shared/pipes/mexican-currency.pipe';

@Component({
  selector: 'app-dashboard',
  imports: [ButtonDirective, CardComponent, MexicanCurrencyPipe, RouterLink],
  template: `
    <div class="app-screen">
      <header class="app-screen-header">
        <h1>Hola, {{ userName() }} 👋</h1>
        <span class="screen-period">{{ periodLabel() }}</span>
      </header>
      <main class="app-screen-content">
        <app-card title="Balance del mes">
          @if (balance(); as data) {
            <div class="balance-hero" [class.balance-hero--danger]="data.endOfMonthProjection < 0">
              <p class="balance-hero__label">Proyección a fin de mes</p>
              <p class="balance-hero__amount">{{ data.endOfMonthProjection | mexicanCurrency }}</p>
              <p class="balance-hero__sublabel">
                @if (data.endOfMonthProjection < 0) {
                  Saldo en rojo. Te faltarían
                  <strong>{{ -data.endOfMonthProjection | mexicanCurrency }}</strong>.
                } @else {
                  Saldo positivo este mes.
                }
              </p>
            </div>

            <ul class="balance-breakdown" aria-label="Desglose del balance">
              <li>
                <span class="breakdown-label">Disponible</span>
                <span class="breakdown-value breakdown-value--primary">{{ data.totalAvailable | mexicanCurrency }}</span>
              </li>
              <li>
                <span class="breakdown-label">Deuda exigible (tarjetas)</span>
                <span class="breakdown-value breakdown-value--expense">−{{ data.billableDebtThisMonth | mexicanCurrency }}</span>
              </li>
              <li>
                <span class="breakdown-label">Pagos fijos pendientes</span>
                <span class="breakdown-value breakdown-value--expense">−{{ data.pendingFixedPayments | mexicanCurrency }}</span>
              </li>
              <li class="breakdown-row--net">
                <span class="breakdown-label">Saldo neto del mes</span>
                <span class="breakdown-value" [class.breakdown-value--danger]="data.netBalanceThisMonth < 0">
                  {{ data.netBalanceThisMonth | mexicanCurrency }}
                </span>
              </li>
              <li>
                <span class="breakdown-label">Ingreso esperado</span>
                <span class="breakdown-value breakdown-value--success">+{{ data.pendingIncome | mexicanCurrency }}</span>
              </li>
            </ul>

            <div class="balance-actions">
              <a appButton variant="secondary" routerLink="/expenses">
                <span class="material-symbols-outlined icon icon--small" aria-hidden="true">shopping_cart</span>
                Registrar gasto
              </a>
              <a appButton variant="secondary" routerLink="/income">
                <span class="material-symbols-outlined icon icon--small" aria-hidden="true">trending_up</span>
                Registrar ingreso
              </a>
            </div>
          } @else {
            <p class="balance-loading">Cargando balance…</p>
          }
        </app-card>
      </main>
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .screen-period {
        font-size: var(--text-size-small);
        color: var(--text-secondary);
      }
      .balance-hero {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        padding-bottom: var(--space-4);
        border-bottom: 1px solid var(--border-default);
        margin-bottom: var(--space-3);
      }
      .balance-hero__label {
        margin: 0;
        font-size: var(--text-size-small);
        color: var(--text-secondary);
        font-weight: 500;
      }
      .balance-hero__amount {
        margin: 0;
        font-size: var(--text-size-display);
        font-weight: 700;
        font-family: var(--font-family-mono);
        color: var(--text-primary);
        line-height: 1.1;
      }
      .balance-hero--danger .balance-hero__amount {
        color: var(--color-danger);
      }
      .balance-hero__sublabel {
        margin: 0;
        font-size: var(--text-size-small);
        color: var(--text-secondary);
      }
      .balance-hero--danger .balance-hero__sublabel {
        color: var(--color-danger);
      }
      .balance-hero__sublabel strong {
        font-family: var(--font-family-mono);
      }
      .balance-breakdown {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        list-style: none;
        margin: 0 0 var(--space-3);
        padding: 0;
      }
      .balance-breakdown li {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: var(--space-3);
        font-size: var(--text-size-small);
      }
      .breakdown-label { color: var(--text-secondary); }
      .breakdown-value {
        font-family: var(--font-family-mono);
        font-weight: 600;
        color: var(--text-primary);
      }
      .breakdown-value--primary { color: var(--color-primary); }
      .breakdown-value--success { color: var(--color-success); }
      .breakdown-value--expense { color: var(--text-primary); }
      .breakdown-value--danger { color: var(--color-danger); }
      .breakdown-row--net {
        padding-top: var(--space-2);
        border-top: 1px solid var(--border-default);
      }
      .breakdown-row--net .breakdown-label { color: var(--text-primary); font-weight: 600; }
      .breakdown-row--net .breakdown-value { font-size: var(--text-size-base); }
      .balance-actions {
        display: flex;
        gap: var(--space-2);
        flex-wrap: wrap;
      }
      .balance-loading {
        margin: 0;
        color: var(--text-secondary);
        text-align: center;
        padding: var(--space-4) 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly balanceService = inject(BalanceService);
  private readonly settingsService = inject(SettingsService);

  protected readonly userName = signal('');
  protected readonly balance = signal<MonthlyBalance | null>(null);
  protected readonly currentMonth = signal(new Date().getMonth() + 1);
  protected readonly currentYear = signal(new Date().getFullYear());

  protected readonly periodLabel = computed(() => {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    return `${monthNames[this.currentMonth() - 1]} ${this.currentYear()}`;
  });

  constructor() {
    void this.loadUserName();
    effect(() => {
      const month = this.currentMonth();
      const year = this.currentYear();
      void this.loadBalance(month, year);
    });
  }

  private async loadUserName(): Promise<void> {
    const record = await this.settingsService.get();
    this.userName.set(record?.userName ?? '');
  }

  private async loadBalance(month: number, year: number): Promise<void> {
    try {
      this.balance.set(await this.balanceService.calculate(month, year));
    } catch (error) {
      console.error('Balance load error', error);
      this.balance.set(null);
    }
  }
}
