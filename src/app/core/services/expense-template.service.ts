import { Injectable, inject } from '@angular/core';

import { database } from '../database/bolsi.database';
import type { Expense } from '../models/expense.model';
import type { ExpenseTemplate } from '../models/expense-template.model';
import { ExpenseService } from './expense.service';

@Injectable({ providedIn: 'root' })
export class ExpenseTemplateService {
  private readonly expenseService = inject(ExpenseService);

  async getAll(): Promise<ExpenseTemplate[]> {
    const templates = await database.expenseTemplates.toArray();
    return templates.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async create(template: ExpenseTemplate): Promise<number> {
    this.validate(template);
    const all = await this.getAll();
    const id = await database.expenseTemplates.add({
      ...template,
      sortOrder: template.sortOrder ?? all.length,
    });
    return id as number;
  }

  async update(template: ExpenseTemplate): Promise<void> {
    if (template.id === undefined) {
      throw new Error('No se puede actualizar una plantilla sin identificador.');
    }
    this.validate(template);
    await database.expenseTemplates.put(template);
  }

  async delete(id: number): Promise<void> {
    await database.expenseTemplates.delete(id);
  }

  /**
   * Registers a new expense from a template. The date defaults to today
   * and the month/year are recomputed from that date so the expense
   * shows up in the current month's lists and totals.
   */
  async registerFromTemplate(templateId: number): Promise<number> {
    const template = await database.expenseTemplates.get(templateId);
    if (!template) {
      throw new Error('Plantilla no encontrada.');
    }
    const today = new Date();
    const iso = this.toIsoDate(today);
    return this.expenseService.create({
      date: iso,
      description: template.description,
      amount: template.amount,
      paymentMethodId: template.paymentMethodId,
      pocketId: template.pocketId,
      category: template.category,
      month: today.getMonth() + 1,
      year: today.getFullYear(),
      isInstallment: false,
    });
  }

  async saveFromExpense(expense: Expense, icon: string = 'star'): Promise<number> {
    return this.create({
      description: expense.description,
      amount: expense.amount,
      paymentMethodId: expense.paymentMethodId,
      pocketId: expense.pocketId,
      category: expense.category,
      icon,
      sortOrder: 0,
    });
  }

  private validate(template: ExpenseTemplate): void {
    if (!template.description.trim()) {
      throw new Error('La descripción de la plantilla es obligatoria.');
    }
    if (!Number.isFinite(template.amount) || template.amount <= 0) {
      throw new Error('El monto de la plantilla debe ser mayor a 0.');
    }
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
