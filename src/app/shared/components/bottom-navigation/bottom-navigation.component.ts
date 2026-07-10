import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavigationEntry {
  readonly path: string;
  readonly label: string;
  readonly icon: string;
}

@Component({
  selector: 'app-bottom-navigation',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="bottom-navigation" aria-label="Navegación principal">
      @for (entry of entries; track entry.path) {
        <a
          class="navigation-item"
          [routerLink]="entry.path"
          routerLinkActive="navigation-item--active"
          [routerLinkActiveOptions]="{ exact: entry.path === '/dashboard' }"
        >
          <span class="material-symbols-outlined icon" aria-hidden="true">{{ entry.icon }}</span>
          <span class="navigation-item__label">{{ entry.label }}</span>
        </a>
      }
    </nav>
  `,
  styleUrl: './bottom-navigation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavigationComponent {
  protected readonly entries: readonly NavigationEntry[] = [
    { path: '/dashboard', label: 'Inicio', icon: 'home' },
    { path: '/expenses', label: 'Gastos', icon: 'shopping_cart' },
    { path: '/templates', label: 'Gasto rápido', icon: 'bolt' },
    { path: '/monthly-payments', label: 'Pagos', icon: 'calendar_month' },
    { path: '/settings', label: 'Ajustes', icon: 'settings' },
  ];
}
