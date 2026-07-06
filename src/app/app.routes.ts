import { Routes } from '@angular/router';

import { setupCompleteGuard } from './core/guards/setup-complete.guard';
import { setupRequiredGuard } from './core/guards/setup-required.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'onboarding' },
  {
    path: 'onboarding',
    canActivate: [setupCompleteGuard],
    loadComponent: () =>
      import('./features/onboarding/onboarding.component').then((m) => m.OnboardingComponent),
  },
  {
    path: 'dashboard',
    canActivate: [setupRequiredGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'expenses',
    canActivate: [setupRequiredGuard],
    loadComponent: () =>
      import('./features/expenses/expenses-placeholder.component').then(
        (m) => m.ExpensesPlaceholderComponent,
      ),
  },
  {
    path: 'credit-cards',
    canActivate: [setupRequiredGuard],
    loadComponent: () =>
      import('./features/credit-cards/credit-cards-placeholder.component').then(
        (m) => m.CreditCardsPlaceholderComponent,
      ),
  },
  {
    path: 'monthly-payments',
    canActivate: [setupRequiredGuard],
    loadComponent: () =>
      import('./features/monthly-payments/monthly-payments-placeholder.component').then(
        (m) => m.MonthlyPaymentsPlaceholderComponent,
      ),
  },
  {
    path: 'settings',
    canActivate: [setupRequiredGuard],
    loadComponent: () =>
      import('./features/settings/settings-placeholder.component').then(
        (m) => m.SettingsPlaceholderComponent,
      ),
  },
  { path: '**', redirectTo: 'onboarding' },
];
