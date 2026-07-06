import { Injectable, inject } from '@angular/core';

import { database } from '../database/bolsi.database';
import type { Expense } from '../models/expense.model';
import { PocketService } from './pocket.service';
import { PaymentMethodService } from './payment-method.service';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly paymentMethods = inject(PaymentMethodService);
  private readonly pockets = inject(PocketService);

  async getByMonth(month: number, year: number): Promise<Expense[]> {
    const all = await database.expenses.toArray();
    return all
      .filter((expense) => expense.month === month && expense.year === year)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getByPocket(pocketId: number, month: number, year: number): Promise<Expense[]> {
    const all = await database.expenses.toArray();
    return all
      .filter(
        (expense) => expense.pocketId === pocketId && expense.month === month && expense.year === year,
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async create(expense: Expense): Promise<number> {
    this.assertNoInstallment(expense);
    this.assertValidFields(expense);
    await this.assertPaymentMethodExists(expense.paymentMethodId);
    await this.assertPocketExists(expense.pocketId);
    await this.paymentMethods.deductBalance(expense.paymentMethodId, expense.amount);
    const id = await database.expenses.add(expense);
    return id as number;
  }

  async update(previous: Expense, updated: Expense): Promise<void> {
    if (previous.id === undefined) {
      throw new Error('No se puede actualizar un gasto sin identificador.');
    }
    this.assertNoInstallment(updated);
    this.assertValidFields(updated);
    await this.assertPaymentMethodExists(updated.paymentMethodId);
    await this.assertPocketExists(updated.pocketId);
    this.reverseBalance(previous);
    await this.paymentMethods.deductBalance(updated.paymentMethodId, updated.amount);
    await database.expenses.put({ ...updated, id: previous.id });
  }

  async delete(expense: Expense): Promise<void> {
    if (expense.id === undefined) {
      return;
    }
    this.reverseBalance(expense);
    await database.expenses.delete(expense.id);
  }

  private reverseBalance(expense: Expense): void {
    void this.paymentMethods.addBalance(expense.paymentMethodId, expense.amount);
  }

  private assertNoInstallment(expense: Expense): void {
    if (expense.isInstallment) {
      throw new Error(
        'Los gastos a meses sin intereses se crean desde el flujo de tarjetas (próxima fase).',
      );
    }
  }

  private assertValidFields(expense: Expense): void {
    if (!Number.isFinite(expense.amount) || expense.amount <= 0) {
      throw new Error('El monto del gasto debe ser mayor a 0.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expense.date)) {
      throw new Error('La fecha del gasto debe tener el formato YYYY-MM-DD.');
    }
    if (!Number.isInteger(expense.month) || expense.month < 1 || expense.month > 12) {
      throw new Error('El mes del gasto debe estar entre 1 y 12.');
    }
    if (!Number.isInteger(expense.year) || expense.year < 1900 || expense.year > 9999) {
      throw new Error('El año del gasto no es válido.');
    }
    if (!expense.description.trim()) {
      throw new Error('La descripción del gasto es obligatoria.');
    }
  }

  private async assertPaymentMethodExists(id: number): Promise<void> {
    const method = await this.paymentMethods.getById(id);
    if (!method) {
      throw new Error('El método de pago seleccionado no existe.');
    }
  }

  private async assertPocketExists(id: number): Promise<void> {
    const pocket = await this.pockets.getAll();
    if (!pocket.some((p) => p.id === id)) {
      throw new Error('El bolsillo seleccionado no existe.');
    }
  }
}
