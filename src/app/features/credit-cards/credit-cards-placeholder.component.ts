import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-credit-cards-placeholder',
  template: `
    <div class="screen">
      <header class="screen-header">
        <h1>Tarjetas de crédito</h1>
      </header>
      <main class="screen-content">
        <p class="placeholder-message">Disponible en la siguiente fase.</p>
      </main>
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .placeholder-message {
        text-align: center;
        color: var(--text-secondary);
        padding: var(--space-8) 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditCardsPlaceholderComponent {}
