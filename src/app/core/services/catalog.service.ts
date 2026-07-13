import { inject, Injectable, signal } from '@angular/core';

import { database } from '../database/bolsi.database';

export const EXPENSE_CATEGORIES_DEFAULT = [
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

export const INCOME_CATEGORIES_DEFAULT = [
  'Salario',
  'Devoluciones',
  'Regalo',
  'Reembolso',
  'Otro',
] as const;

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
  'build',
  'piggy_bank',
  'add_circle',
  'remove_circle',
] as const;

export const DEFAULT_POCKETS = [
  { name: 'Necesidades', icon: 'home', percentage: 60, sortOrder: 0 },
  { name: 'Prescindibles', icon: 'movie', percentage: 20, sortOrder: 1 },
  { name: 'Ahorros', icon: 'money_bag', percentage: 20, sortOrder: 2 },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES_DEFAULT)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES_DEFAULT)[number];

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly customExpenseCategories = signal<string[]>([]);
  private readonly customIncomeCategories = signal<string[]>([]);

  async load(): Promise<void> {
    const settings = await database.appSettings.toCollection().first();
    this.customExpenseCategories.set(settings?.customExpenseCategories ?? []);
    this.customIncomeCategories.set((settings as unknown as Record<string, unknown>)?.['customIncomeCategories'] as string[] ?? []);
  }

  getExpenseCategories(): string[] {
    return [...EXPENSE_CATEGORIES_DEFAULT, ...this.customExpenseCategories()];
  }

  getIncomeCategories(): string[] {
    return [...INCOME_CATEGORIES_DEFAULT, ...this.customIncomeCategories()];
  }

  getIcons(): readonly string[] {
    return MATERIAL_ICONS;
  }

  getDefaultPockets() {
    return DEFAULT_POCKETS;
  }

  async addExpenseCategory(name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = this.customExpenseCategories();
    if (current.includes(trimmed) || EXPENSE_CATEGORIES_DEFAULT.includes(trimmed as ExpenseCategory)) return;
    const updated = [...current, trimmed];
    this.customExpenseCategories.set(updated);
    await this.persistCustomCategories();
  }

  async removeExpenseCategory(name: string): Promise<void> {
    const updated = this.customExpenseCategories().filter((c) => c !== name);
    this.customExpenseCategories.set(updated);
    await this.persistCustomCategories();
  }

  async addIncomeCategory(name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = this.customIncomeCategories();
    if (current.includes(trimmed) || INCOME_CATEGORIES_DEFAULT.includes(trimmed as IncomeCategory)) return;
    const updated = [...current, trimmed];
    this.customIncomeCategories.set(updated);
    await this.persistCustomIncomeCategories();
  }

  async removeIncomeCategory(name: string): Promise<void> {
    const updated = this.customIncomeCategories().filter((c) => c !== name);
    this.customIncomeCategories.set(updated);
    await this.persistCustomIncomeCategories();
  }

  private async persistCustomCategories(): Promise<void> {
    const settings = await database.appSettings.toCollection().first();
    if (settings?.id !== undefined) {
      await database.appSettings.update(settings.id, {
        customExpenseCategories: this.customExpenseCategories(),
      });
    }
  }

  private async persistCustomIncomeCategories(): Promise<void> {
    const settings = await database.appSettings.toCollection().first();
    if (settings?.id !== undefined) {
      await database.appSettings.update(settings.id, {
        customIncomeCategories: this.customIncomeCategories(),
      });
    }
  }
}
