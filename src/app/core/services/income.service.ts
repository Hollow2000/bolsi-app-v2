import { Injectable, inject } from '@angular/core';

import { database } from '../database/bolsi.database';
import type { Income } from '../models/income.model';
import { PaymentMethodService } from './payment-method.service';
import { assertCanReceiveIncome, validateIncomeFields } from '../validations/income.validation';

@Injectable({ providedIn: 'root' })
export class IncomeService {
  private readonly paymentMethods = inject(PaymentMethodService);

  async getByMonth(month: number, year: number): Promise<Income[]> {
    const all = await database.incomes.toArray();
    return all
      .filter((income) => income.month === month && income.year === year)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async create(income: Income): Promise<void> {
    validateIncomeFields(income);
    const paymentMethod = await this.paymentMethods.getById(income.paymentMethodId);
    assertCanReceiveIncome(paymentMethod);
    await database.incomes.add(income);
    if (income.status === 'received') {
      await this.paymentMethods.addBalance(income.paymentMethodId, income.amount);
    }
  }

  /**
   * Replaces the previous income record with the updated one. The balance
   * effect is recomputed from scratch: the old effect is reversed, then
   * the new one is applied. This correctly handles every combination of
   * payment-method change, amount change, and status change in a single
   * pass without branching.
   */
  async update(previousIncome: Income, updatedIncome: Income): Promise<void> {
    if (previousIncome.id === undefined) {
      throw new Error('No se puede actualizar un ingreso sin identificador.');
    }
    validateIncomeFields(updatedIncome);
    const paymentMethod = await this.paymentMethods.getById(updatedIncome.paymentMethodId);
    assertCanReceiveIncome(paymentMethod);

    if (previousIncome.status === 'received') {
      await this.paymentMethods.deductBalance(
        previousIncome.paymentMethodId,
        previousIncome.amount,
      );
    }
    if (updatedIncome.status === 'received') {
      await this.paymentMethods.addBalance(
        updatedIncome.paymentMethodId,
        updatedIncome.amount,
      );
    }

    const derived = deriveMonthAndYear(updatedIncome.date);
    await database.incomes.put({ ...updatedIncome, id: previousIncome.id, ...derived });
  }

  async markAsReceived(id: number): Promise<void> {
    const income = await database.incomes.get(id);
    if (!income || income.status === 'received') {
      return;
    }
    const paymentMethod = await this.paymentMethods.getById(income.paymentMethodId);
    assertCanReceiveIncome(paymentMethod);
    await database.incomes.put({ ...income, status: 'received' });
    await this.paymentMethods.addBalance(income.paymentMethodId, income.amount);
  }

  async delete(income: Income): Promise<void> {
    if (income.id === undefined) {
      return;
    }
    if (income.status === 'received') {
      await this.paymentMethods.deductBalance(income.paymentMethodId, income.amount);
    }
    await database.incomes.delete(income.id);
  }
}

function deriveMonthAndYear(isoDate: string): { month: number; year: number } {
  const parts = isoDate.split('-').map((segment) => Number(segment));
  if (parts.length !== 3 || parts.some((segment) => !Number.isInteger(segment))) {
    throw new Error('Fecha inválida al derivar mes y año.');
  }
  return { year: parts[0], month: parts[1] };
}
