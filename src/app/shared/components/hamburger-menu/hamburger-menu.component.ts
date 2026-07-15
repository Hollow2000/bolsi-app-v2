import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface MenuEntry {
  readonly path: string;
  readonly label: string;
  readonly icon: string;
}

@Component({
  selector: 'app-hamburger-menu',
  imports: [RouterLink],
  template: `
    <button
      class="navigation-item"
      type="button"
      aria-label="Abrir menú"
      aria-haspopup="true"
      [attr.aria-expanded]="isOpen()"
      (click)="toggle()"
    >
      <span class="material-symbols-outlined icon" aria-hidden="true">menu</span>
      <span class="navigation-item__label">Menú</span>
    </button>

    @if (isOpen()) {
      <div class="hamburger-overlay" (click)="close()"></div>
      <nav class="hamburger-panel" aria-label="Menú de navegación">
        <div class="hamburger-panel__header">
          <div class="hamburger-panel__brand">
            <img src="icons/icon-96.png" alt="" class="hamburger-panel__logo" width="40" height="40" />
            <span class="hamburger-panel__title">Bolsi</span>
          </div>
          <button
            class="app-icon-button"
            type="button"
            aria-label="Cerrar menú"
            (click)="close()"
          >
            <span class="material-symbols-outlined icon" aria-hidden="true">close</span>
          </button>
        </div>
        <ul class="hamburger-panel__list">
          @for (entry of entries; track entry.path) {
            <li>
              <a
                class="hamburger-panel__item"
                [routerLink]="entry.path"
                (click)="close()"
              >
                <span class="material-symbols-outlined icon" aria-hidden="true">{{ entry.icon }}</span>
                <span class="hamburger-panel__label">{{ entry.label }}</span>
              </a>
            </li>
          }
        </ul>
      </nav>
    }
  `,
  styleUrl: './hamburger-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HamburgerMenuComponent {
  protected readonly isOpen = signal(false);
  protected readonly closed = output();

  protected readonly entries: readonly MenuEntry[] = [
    { path: '/settings', label: 'Ajustes', icon: 'settings' },
    { path: '/catalogs', label: 'Categorías', icon: 'category' },
    { path: '/pockets', label: 'Bolsillos', icon: 'wallet' },
    { path: '/savings', label: 'Ahorros', icon: 'savings' },
    { path: '/scheduled-savings', label: 'Ahorros prog.', icon: 'schedule' },
    { path: '/budgets', label: 'Presupuestos', icon: 'account_balance_wallet' },
    { path: '/templates', label: 'Gasto rápido', icon: 'bolt' },
    { path: '/monthly-payments', label: 'Pagos', icon: 'calendar_month' },
    { path: '/history', label: 'Historial', icon: 'history' },
  ];

  protected toggle(): void {
    this.isOpen.update((v) => !v);
  }

  protected close(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }
}
