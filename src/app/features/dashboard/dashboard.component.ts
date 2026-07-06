import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { SettingsService } from '../../core/services/settings.service';
import { CardComponent } from '../../shared/components/card/card.component';
import { ButtonDirective } from '../../shared/components/button/button.directive';

@Component({
  selector: 'app-dashboard',
  imports: [CardComponent, ButtonDirective],
  template: `
    <div class="app-screen">
      <header class="app-screen-header">
        <h1>Hola, {{ userName() }} 👋</h1>
      </header>
      <main class="app-screen-content">
        <app-card title="Tu panel principal">
          <p class="welcome">Los widgets del dashboard llegan en la siguiente fase.</p>
          <button appButton variant="secondary" type="button">
            <span class="material-symbols-outlined icon icon--small" aria-hidden="true">add</span>
            Registrar gasto rápido
          </button>
        </app-card>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly settings = inject(SettingsService);

  protected readonly userName = signal<string>('');

  constructor() {
    void this.loadUserName();
  }

  private async loadUserName(): Promise<void> {
    const record = await this.settings.get();
    this.userName.set(record?.userName ?? '');
  }
}
