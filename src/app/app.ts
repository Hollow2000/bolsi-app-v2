import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs/operators';

import { BottomNavigationComponent } from './shared/components/bottom-navigation/bottom-navigation.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BottomNavigationComponent],
  template: `
    <router-outlet />
    @if (showNavigation()) {
      <app-bottom-navigation />
    }
  `,
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);

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
}
