export const EXPENSE_CATEGORIES = [
  'Vivienda',
  'Servicios',
  'Supermercado',
  'Transporte',
  'Ropa',
  'Seguros',
  'Salud',
  'Compras menores',
  'Comidas fuera',
  'Entretenimiento',
  'Belleza',
  'Recargas',
  'Regalos',
  'Viajes',
  'Tecnología',
  'Otro',
] as const;

export const INCOME_CATEGORIES = [
  'Salario',
  'Devoluciones',
  'Regalo',
  'Reembolso',
  'Otro',
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
