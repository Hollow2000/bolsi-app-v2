import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HamburgerMenuComponent } from '../hamburger-menu/hamburger-menu.component';

interface NavigationEntry {
  readonly path: string;
  readonly label: string;
  readonly icon: string;
}

@Component({
  selector: 'app-bottom-navigation',
  imports: [RouterLink, RouterLinkActive, HamburgerMenuComponent],
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
      <app-hamburger-menu />
    </nav>
  `,
  styleUrl: './bottom-navigation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavigationComponent {
  protected readonly entries: readonly NavigationEntry[] = [
    { path: '/dashboard', label: 'Inicio', icon: 'home' },
    { path: '/expenses', label: 'Gastos', icon: 'shopping_cart' },
    { path: '/income', label: 'Ingresos', icon: 'paid' },
    { path: '/credit-cards', label: 'Cuentas', icon: 'credit_card' },
  ];
}
