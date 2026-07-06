export const EXPENSE_CATEGORIES = [
  'Housing',
  'Utilities',
  'Groceries',
  'Transportation',
  'Clothing',
  'Insurance',
  'Health',
  'Small purchases',
  'Dining out',
  'Entertainment',
  'Beauty',
  'Phone top-ups',
  'Gifts',
  'Travel',
  'Technology',
  'Other',
] as const;

export const INCOME_CATEGORIES = [
  'Salary',
  'Returns',
  'Gift',
  'Cashback',
  'Other',
] as const;

export const INSTALLMENT_OPTIONS = [3, 6, 9, 12, 18, 24] as const;

export const DEFAULT_POCKETS = [
  { name: 'Necesidades', emoji: '🏠', percentage: 60, sortOrder: 0 },
  { name: 'Prescindibles', emoji: '🎬', percentage: 20, sortOrder: 1 },
  { name: 'Ahorros', emoji: '💰', percentage: 20, sortOrder: 2 },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type InstallmentOption = (typeof INSTALLMENT_OPTIONS)[number];
