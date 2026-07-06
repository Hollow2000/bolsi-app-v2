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
