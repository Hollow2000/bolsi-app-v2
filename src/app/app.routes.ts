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
      import('./features/expenses/expenses-list.component').then((m) => m.ExpensesListComponent),
  },
  {
    path: 'credit-cards',
    canActivate: [setupRequiredGuard],
    loadComponent: () =>
      import('./features/credit-cards/payment-methods-list.component').then(
        (m) => m.PaymentMethodsListComponent,
      ),
  },
  {
    path: 'income',
    canActivate: [setupRequiredGuard],
    loadComponent: () =>
      import('./features/income/income-list.component').then((m) => m.IncomeListComponent),
  },
  {
    path: 'pockets',
    canActivate: [setupRequiredGuard],
    loadComponent: () =>
      import('./features/pockets/pockets-list.component').then((m) => m.PocketsListComponent),
  },
  {
    path: 'settings',
    canActivate: [setupRequiredGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'monthly-payments',
    canActivate: [setupRequiredGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  { path: '**', redirectTo: 'onboarding' },
];
