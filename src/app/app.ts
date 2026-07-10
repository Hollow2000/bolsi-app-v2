import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter, map } from 'rxjs/operators';

import type { PaymentMethod } from './core/models/payment-method.model';
import { CreditCardStatementService } from './core/services/credit-card-statement.service';
import { PaymentMethodService } from './core/services/payment-method.service';
import { BottomSheetComponent } from './shared/components/bottom-sheet/bottom-sheet.component';
import { ButtonDirective } from './shared/components/button/button.directive';
import { BottomNavigationComponent } from './shared/components/bottom-navigation/bottom-navigation.component';
import { InstallPromptComponent } from './shared/components/install-prompt/install-prompt.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { ToastService } from './shared/services/toast.service';
import { MexicanCurrencyPipe } from './shared/pipes/mexican-currency.pipe';

@Component({
  selector: 'app-root',
  imports: [BottomNavigationComponent, BottomSheetComponent, ButtonDirective, InstallPromptComponent, MexicanCurrencyPipe, RouterOutlet, ToastComponent],
  template: `
    <router-outlet />
    @if (showNavigation()) {
      <app-bottom-navigation />
    }
    <app-install-prompt />
    @if (toastMessage(); as message) {
      <app-toast>{{ message }}</app-toast>
    }
    @if (cutoffCard()) {
      <app-bottom-sheet title="Cerrar período de tarjeta" (close)="dismissCutoff()">
        <p class="cutoff-message">
          ¿Cerrar período de <strong>{{ cutoffCard()!.name }}</strong>?
        </p>
        <p class="cutoff-amount">
          Saldo al corte: <strong>{{ cutoffAmount() | mexicanCurrency }}</strong>
        </p>
        <p class="cutoff-hint">
          Si falta registrar algún gasto, cancela y agrégalo primero.
        </p>
        <div class="modal-actions">
          <button appButton variant="secondary" type="button" (click)="dismissCutoff()">
            Cancelar
          </button>
          <button appButton variant="primary" type="button" (click)="confirmCutoff()">
            Cerrar período
          </button>
        </div>
      </app-bottom-sheet>
    }
    @if (updateAvailable()) {
      <app-bottom-sheet title="Nueva versión de Bolsi disponible" (close)="dismissUpdate()">
        <p class="update-message">¿Desea actualizar ahora?</p>
        <div class="modal-actions">
          <button appButton variant="secondary" type="button" (click)="dismissUpdate()">
            No, más tarde
          </button>
          <button appButton variant="primary" type="button" (click)="applyUpdate()">
            Sí
          </button>
        </div>
      </app-bottom-sheet>
    }
  `,
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly creditCardStatement = inject(CreditCardStatementService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly swUpdate = inject(SwUpdate);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly showNavigation = computed(() => {
    const url = this.currentUrl();
    return !url.startsWith('/onboarding') && url !== '/' && url !== '';
  });

  protected readonly toastMessage = this.toast.message;

  protected readonly cutoffCard = signal<PaymentMethod | null>(null);
  protected readonly cutoffAmount = signal(0);
  protected readonly updateAvailable = signal(false);

  async ngOnInit(): Promise<void> {
    await this.checkCutoffs();
    this.checkForUpdates();
  }

  private checkForUpdates(): void {
    if (!this.swUpdate.isEnabled) return;
    this.swUpdate.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.updateAvailable.set(true);
      }
    });
  }

  protected applyUpdate(): void {
    window.location.reload();
  }

  protected dismissUpdate(): void {
    this.updateAvailable.set(false);
  }

  private async checkCutoffs(): Promise<void> {
    try {
      const methods = await this.paymentMethodService.getAll();
      const today = new Date();
      for (const method of methods) {
        if (method.type === 'credit' && this.creditCardStatement.needsCutoff(method, today)) {
          // Calculate charges for the billing period that just ended
          const closingDay = method.statementClosingDay ?? 1;
          const previousPeriod = this.creditCardStatement.getPreviousCutoffPeriod(closingDay, today);
          const periodCharges = await this.creditCardStatement.calculatePeriodCharges(
            method,
            previousPeriod,
            today,
          );
          this.cutoffCard.set(method);
          this.cutoffAmount.set(Math.round(periodCharges * 100) / 100);
          break; // Only show one at a time
        }
      }
    } catch (error) {
      console.error('Cutoff check error', error);
    }
  }

  protected async confirmCutoff(): Promise<void> {
    const card = this.cutoffCard();
    if (!card) return;
    try {
      const today = new Date();
      await this.creditCardStatement.processCutoff(card, today);
      this.toast.show(`Período de ${card.name} cerrado.`);
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'No se pudo cerrar el período.');
    }
    this.cutoffCard.set(null);
    this.cutoffAmount.set(0);
  }

  protected dismissCutoff(): void {
    this.cutoffCard.set(null);
    this.cutoffAmount.set(0);
  }
}
