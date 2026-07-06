import { ChangeDetectionStrategy, Component } from '@angular/core';

import { CardComponent } from '../../shared/components/card/card.component';

@Component({
  selector: 'app-credit-cards-placeholder',
  imports: [CardComponent],
  template: `
    <div class="app-screen">
      <header class="app-screen-header">
        <h1>Tarjetas de crédito</h1>
      </header>
      <main class="app-screen-content">
        <app-card title="Próximamente">
          <p class="placeholder-message">La lista de tarjetas y su detalle llegan en la siguiente fase.</p>
        </app-card>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditCardsPlaceholderComponent {}
