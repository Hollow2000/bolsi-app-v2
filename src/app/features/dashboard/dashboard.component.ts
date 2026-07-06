import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="screen">
      <header class="screen-header">
        <h1>Hola, {{ userName() }} 👋</h1>
      </header>
      <main class="screen-content">
        <p class="welcome">Tu panel principal llega en la siguiente fase.</p>
      </main>
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .welcome {
        color: var(--text-secondary);
        font-size: var(--text-size-base);
        text-align: center;
        padding: var(--space-8) 0;
      }
    `,
  ],
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
