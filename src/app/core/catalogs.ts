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

export const INSTALLMENT_MIN = 2;
export const INSTALLMENT_MAX = 48;

export const MATERIAL_ICONS = [
  'money_bag',
  'star',
  'coffee',
  'restaurant',
  'shopping_cart',
  'directions_car',
  'home',
  'fitness_center',
  'school',
  'pets',
  'local_hospital',
  'flight',
  'movie',
  'phone',
  'wifi',
  'bolt',
  'savings',
  'account_balance',
  'payments',
  'credit_card',
  'trending_up',
  'calendar_month',
  'work',
  'sports_esports',
  'music_note',
  'palette',
  'brush',
  'local_grocery_store',
  'self_improvement',
  'commute',
  'luggage',
  'celebration',
  'emoji_emotions',
  'baby_changing_station',
  'family_restroom',
  'spa',
  'local_cafe',
  'local_bar',
  'fastfood',
  'cake',
  'support',
  'emergency',
  'medical_services',
  'beach_access',
  'apparel',
  'laundry',
  'chair',
  'build'
] as const;

export const DEFAULT_POCKETS = [
  { name: 'Necesidades', icon: 'home', percentage: 60, sortOrder: 0 },
  { name: 'Prescindibles', icon: 'movie', percentage: 20, sortOrder: 1 },
  { name: 'Ahorros', icon: 'money_bag', percentage: 20, sortOrder: 2 },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
