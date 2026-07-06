import { ChangeDetectionStrategy, Component } from '@angular/core';

import { CardComponent } from '../../shared/components/card/card.component';

@Component({
  selector: 'app-expenses-placeholder',
  imports: [CardComponent],
  template: `
    <div class="app-screen">
      <header class="app-screen-header">
        <h1>Gastos</h1>
      </header>
      <main class="app-screen-content">
        <app-card title="Próximamente">
          <p class="placeholder-message">El registro y la lista de gastos llegan en la siguiente fase.</p>
        </app-card>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensesPlaceholderComponent {}
