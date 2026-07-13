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
    path: 'credit-cards/:id',
    canActivate: [setupRequiredGuard],
    loadComponent: () =>
      import('./features/credit-cards/credit-card-detail.component').then(
        (m) => m.CreditCardDetailComponent,
      ),
  },
  {
    path: 'payment-methods/:id',
    canActivate: [setupRequiredGuard],
    loadComponent: () =>
      import('./features/credit-cards/payment-method-detail.component').then(
        (m) => m.PaymentMethodDetailComponent,
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
    path: 'pockets/:id',
    canActivate: [setupRequiredGuard],
    loadComponent: () =>
      import('./features/pockets/pocket-detail.component').then((m) => m.PocketDetailComponent),
  },
  {
    path: 'settings',
    canActivate: [setupRequiredGuard],
    loadComponent: () =>
      import('./features/settings/settings.component').then((m) => m.SettingsComponent),
  },
  {
    path: 'budgets',
    canActivate: [setupRequiredGuard],
    loadComponent: () =>
      import('./features/budgets/budgets-list.component').then((m) => m.BudgetsListComponent),
  },
  {
    path: 'history',
    canActivate: [setupRequiredGuard],
    loadComponent: () =>
      import('./features/history/history.component').then((m) => m.HistoryComponent),
  },
  {
    path: 'monthly-payments',
    canActivate: [setupRequiredGuard],
    loadComponent: () =>
      import('./features/monthly-payments/monthly-payments-list.component').then(
        (m) => m.MonthlyPaymentsListComponent,
      ),
  },
  {
    path: 'templates',
    canActivate: [setupRequiredGuard],
    loadComponent: () =>
      import('./features/templates/templates-list.component').then((m) => m.TemplatesListComponent),
  },
  {
    path: 'savings',
    canActivate: [setupRequiredGuard],
    loadComponent: () =>
      import('./features/savings/savings-list.component').then((m) => m.SavingsListComponent),
  },
  {
    path: 'savings/:id',
    canActivate: [setupRequiredGuard],
    loadComponent: () =>
      import('./features/savings/savings-detail.component').then((m) => m.SavingsDetailComponent),
  },
  { path: '**', redirectTo: 'onboarding' },
];
