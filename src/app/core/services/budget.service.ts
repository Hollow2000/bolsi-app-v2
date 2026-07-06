import { Injectable, inject } from '@angular/core';

import { database } from '../database/bolsi.database';
import type { Budget } from '../models/budget.model';
import type { Expense } from '../models/expense.model';

export interface BudgetProgress {
  readonly budget: Budget;
  readonly actual: number;
  readonly ratio: number;
}

@Injectable({ providedIn: 'root' })
export class BudgetService {
  async getAll(): Promise<Budget[]> {
    return database.budgets.toArray();
  }

  async getByMonth(month: number, year: number): Promise<Budget[]> {
    const all = await database.budgets.toArray();
    return all.filter((budget) => budget.month === month && budget.year === year);
  }

  async create(budget: Budget): Promise<number> {
    this.validate(budget);
    const id = await database.budgets.add(budget);
    return id as number;
  }

  async update(budget: Budget): Promise<void> {
    if (budget.id === undefined) {
      throw new Error('No se puede actualizar un presupuesto sin identificador.');
    }
    this.validate(budget);
    await database.budgets.put(budget);
  }

  async delete(id: number): Promise<void> {
    await database.budgets.delete(id);
  }

  /**
   * Computes actual vs estimated for every budget in the given month.
   * The actual is the sum of expenses whose category and pocket match
   * the budget. pocketId = 0 means "all pockets".
   */
  async getProgressForMonth(
    month: number,
    year: number,
    expenses: readonly Expense[],
  ): Promise<BudgetProgress[]> {
    const budgets = await this.getByMonth(month, year);
    const monthExpenses = expenses.filter((e) => e.month === month && e.year === year);
    return budgets.map((budget) => {
      const actual = monthExpenses
        .filter((e) => e.category === budget.category)
        .filter((e) => budget.pocketId === 0 || e.pocketId === budget.pocketId)
        .reduce((sum, e) => sum + e.amount, 0);
      const ratio = budget.estimatedAmount > 0 ? actual / budget.estimatedAmount : 0;
      return { budget, actual, ratio };
    });
  }

  private validate(budget: Budget): void {
    if (!budget.category.trim()) {
      throw new Error('La categoría del presupuesto es obligatoria.');
    }
    if (!Number.isFinite(budget.estimatedAmount) || budget.estimatedAmount <= 0) {
      throw new Error('El monto estimado debe ser mayor a 0.');
    }
    if (!Number.isInteger(budget.month) || budget.month < 1 || budget.month > 12) {
      throw new Error('El mes debe estar entre 1 y 12.');
    }
    if (!Number.isInteger(budget.year) || budget.year < 1900 || budget.year > 9999) {
      throw new Error('El año no es válido.');
    }
  }
}
