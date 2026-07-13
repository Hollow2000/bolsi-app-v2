import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';

import type { SavingsAccount } from '../../../core/models/savings-account.model';
import { SavingsService } from '../../../core/services/savings.service';
import { ButtonDirective } from '../button/button.directive';
import { NumberInputComponent } from '../number-input/number-input.component';
import { MexicanCurrencyPipe } from '../../pipes/mexican-currency.pipe';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-yield-prompt-modal',
  imports: [
    ButtonDirective,
    MexicanCurrencyPipe,
    NumberInputComponent,
  ],
  template: `
    <div class="yield-prompt">
      <p class="yield-prompt__message">
        ¿Cuál fue el rendimiento de <strong>{{ account().name }}</strong> este mes?
      </p>
      <div class="yield-prompt__current">
        <span class="yield-prompt__label">Saldo actual:</span>
        <span class="yield-prompt__balance">{{ account().balance | mexicanCurrency }}</span>
      </div>
      <app-number-input
        label="Rendimiento"
        [value]="amount()"
        (valueChange)="amount.set($event)"
      />
      @if (errorMessage()) {
        <p class="yield-prompt__error" role="alert">{{ errorMessage() }}</p>
      }
      <div class="yield-prompt__actions">
        <button
          appButton
          type="button"
          class="yield-prompt__btn yield-prompt__btn--skip"
          (click)="skip.emit()"
        >
          Omitir
        </button>
        <button
          appButton
          type="button"
          class="yield-prompt__btn yield-prompt__btn--save"
          (click)="save()"
        >
          Guardar
        </button>
      </div>
    </div>
  `,
  styles: `
    .yield-prompt {
      padding: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .yield-prompt__message {
      margin: 0;
      font-size: var(--text-size-base);
      color: var(--text-primary);
      text-align: center;
    }
    .yield-prompt__current {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-3);
      background: var(--surface-alternate);
      border-radius: var(--radius-medium);
    }
    .yield-prompt__label {
      font-size: var(--text-size-sm);
      color: var(--text-secondary);
    }
    .yield-prompt__balance {
      font-size: var(--text-size-base);
      font-weight: 600;
      font-family: var(--font-family-mono);
    }
    .yield-prompt__error {
      margin: 0;
      color: var(--color-danger);
      font-size: var(--text-size-small);
      text-align: center;
    }
    .yield-prompt__actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-3);
    }
    .yield-prompt__btn {
      width: 100%;
    }
    .yield-prompt__btn--skip {
      background: var(--surface);
      color: var(--text-secondary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YieldPromptModalComponent {
  private readonly savingsService = inject(SavingsService);
  private readonly toast = inject(ToastService);

  readonly account = input.required<SavingsAccount>();
  readonly skip = output<void>();
  readonly saved = output<void>();

  protected readonly amount = signal(0);
  protected readonly errorMessage = signal<string | null>(null);

  protected async save(): Promise<void> {
    const acc = this.account();
    if (acc.id === undefined) return;

    const amount = this.amount();
    if (amount < 0) {
      this.errorMessage.set('El monto no puede ser negativo.');
      return;
    }

    if (amount === 0) {
      this.skip.emit();
      return;
    }

    try {
      await this.savingsService.addYield(acc.id, amount);
      this.toast.show(`Rendimiento de ${acc.name} registrado.`);
      this.saved.emit();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'No se pudo registrar el rendimiento.');
    }
  }
}
