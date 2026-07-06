import { Routes } from '@angular/router';

/**
 * PHASE 0 placeholder routes. Replaced in PHASE 1 with the full
 * lazy-loaded route tree (onboarding, dashboard, expenses, …).
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'onboarding' },
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./features/onboarding/onboarding-placeholder.component').then(
        (m) => m.OnboardingPlaceholderComponent,
      ),
  },
  { path: '**', redirectTo: 'onboarding' },
];
