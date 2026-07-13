import { Injectable } from '@angular/core';

import { database } from '../database/bolsi.database';
import type { CatalogItem } from '../models/catalog.model';

// Backward compatibility - will be removed when all consumers use CatalogService
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

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES_DEFAULT)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES_DEFAULT)[number];

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
  'category',
  'security',
  'devices',
  'assignment_return',
  'card_giftcard',
  'receipt',
  'shopping_bag',
] as const;

export const DEFAULT_POCKETS = [
  { name: 'Necesidades', icon: 'home', percentage: 60, sortOrder: 0 },
  { name: 'Prescindibles', icon: 'movie', percentage: 20, sortOrder: 1 },
  { name: 'Ahorros', icon: 'money_bag', percentage: 20, sortOrder: 2 },
] as const;

@Injectable({ providedIn: 'root' })
export class CatalogService {
  async getByType(type: 'expense' | 'income'): Promise<CatalogItem[]> {
    return database.catalogs
      .where('type')
      .equals(type)
      .sortBy('sortOrder');
  }

  async getByName(type: 'expense' | 'income', name: string): Promise<CatalogItem | undefined> {
    return database.catalogs
      .where('type')
      .equals(type)
      .filter((item) => item.name === name)
      .first();
  }

  async getIconForCategory(type: 'expense' | 'income', name: string): Promise<string> {
    const item = await this.getByName(type, name);
    return item?.icon ?? 'category';
  }

  async create(item: Omit<CatalogItem, 'id'>): Promise<number> {
    const existing = await this.getByName(item.type, item.name);
    if (existing) {
      throw new Error(`Ya existe una categoría con el nombre "${item.name}".`);
    }
    const maxSort = await database.catalogs
      .where('type')
      .equals(item.type)
      .sortBy('sortOrder');
    const nextSort = maxSort.length > 0 ? maxSort[maxSort.length - 1].sortOrder + 1 : 0;
    const id = await database.catalogs.add({ ...item, sortOrder: nextSort } as CatalogItem);
    return id as number;
  }

  async update(id: number, changes: Pick<CatalogItem, 'name' | 'icon'>): Promise<void> {
    const item = await database.catalogs.get(id);
    if (!item) return;
    if (changes.name && changes.name !== item.name) {
      const duplicate = await this.getByName(item.type, changes.name);
      if (duplicate && duplicate.id !== id) {
        throw new Error(`Ya existe una categoría con el nombre "${changes.name}".`);
      }
    }
    await database.catalogs.update(id, changes);
  }

  async delete(id: number, reassignToName: string): Promise<void> {
    const item = await database.catalogs.get(id);
    if (!item) return;

    if (item.type === 'expense') {
      await database.expenses
        .where('category')
        .equals(item.name)
        .modify({ category: reassignToName });
    } else {
      await database.incomes
        .where('category')
        .equals(item.name)
        .modify({ category: reassignToName });
    }

    await database.catalogs.delete(id);
  }

  async countByCategory(type: 'expense' | 'income', name: string): Promise<number> {
    if (type === 'expense') {
      return database.expenses.where('category').equals(name).count();
    }
    return database.incomes.where('category').equals(name).count();
  }

  async deleteWithoutReassign(id: number): Promise<void> {
    await database.catalogs.delete(id);
  }
}
