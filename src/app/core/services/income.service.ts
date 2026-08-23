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

    if (income.frequency === 'biweekly') {
      await this.createBiweekly(income);
      return;
    }

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

  async markAsReceived(id: number, actualAmount?: number): Promise<void> {
    const income = await database.incomes.get(id);
    if (!income || income.status === 'received') {
      return;
    }
    const paymentMethod = await this.paymentMethods.getById(income.paymentMethodId);
    assertCanReceiveIncome(paymentMethod);
    const amount = actualAmount !== undefined ? actualAmount : income.amount;
    await database.incomes.put({ ...income, status: 'received', amount });
    await this.paymentMethods.addBalance(income.paymentMethodId, amount);
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

  /**
   * Persists a biweekly income as two separate records (BR-01):
   * one on the given date, one 15 days later. Both rows count toward
   * the monthly income total at query time.
   */
  private async createBiweekly(source: Income): Promise<void> {
    const firstDate = parseIsoDate(source.date);
    if (Number.isNaN(firstDate.getTime())) {
      throw new Error('La fecha del ingreso no es válida.');
    }
    const secondDate = new Date(firstDate);
    secondDate.setDate(firstDate.getDate() + 15);

    const first: Income = {
      ...source,
      month: firstDate.getMonth() + 1,
      year: firstDate.getFullYear(),
    };
    const second: Income = {
      ...source,
      date: toIsoDate(secondDate),
      month: secondDate.getMonth() + 1,
      year: secondDate.getFullYear(),
    };

    await database.incomes.bulkAdd([first, second]);
    if (source.status === 'received') {
      await this.paymentMethods.addBalance(source.paymentMethodId, source.amount);
      await this.paymentMethods.addBalance(source.paymentMethodId, source.amount);
    }
  }

  /**
   * Copies recurring incomes (monthly / biweekly) from one month to the
   * next so they keep appearing without manual re-entry. Replicated rows
   * always start as `expected` so they never touch the payment-method
   * balance again — the user marks them received when they actually land.
   *
   * - Monthly: one copy per source record, date shifted +1 month.
   * - Biweekly: the pair is stored as two rows (BR-01). Group them by
   *   (description + amount + paymentMethodId + category), use the
   *   earliest date as the anchor, and rebuild the pair in the target
   *   month (anchor date + 15 days).
   *
   * Returns the number of rows created.
   */
  async replicateRecurring(
    originMonth: number,
    originYear: number,
    targetMonth: number,
    targetYear: number,
  ): Promise<number> {
    const all = await database.incomes.toArray();
    const copies = buildReplicatedIncomes(all, originMonth, originYear, targetMonth, targetYear);
    if (copies.length === 0) {
      return 0;
    }
    await database.incomes.bulkAdd(copies);
    return copies.length;
  }
}

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function deriveMonthAndYear(isoDate: string): { month: number; year: number } {
  const parts = isoDate.split('-').map((segment) => Number(segment));
  if (parts.length !== 3 || parts.some((segment) => !Number.isInteger(segment))) {
    throw new Error('Fecha inválida al derivar mes y año.');
  }
  return { year: parts[0], month: parts[1] };
}

function addDays(isoDate: string, days: number): string {
  const date = parseIsoDate(isoDate);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function buildReplicatedIncomes(
  all: readonly Income[],
  originMonth: number,
  originYear: number,
  targetMonth: number,
  targetYear: number,
): Income[] {
  const recurring = all.filter(
    (income) =>
      income.month === originMonth &&
      income.year === originYear &&
      (income.frequency === 'monthly' || income.frequency === 'biweekly'),
  );
  if (recurring.length === 0) {
    return [];
  }

  const copies: Income[] = [];

  for (const income of recurring) {
    if (income.frequency === 'biweekly') {
      continue;
    }
    const { id: _id, ...rest } = income;
    const shiftedDate = shiftByOneMonth(income.date, targetMonth, targetYear);
    copies.push({
      ...rest,
      date: shiftedDate,
      month: targetMonth,
      year: targetYear,
      status: 'expected',
    });
  }

  const biweeklySources = new Map<string, Income>();
  for (const income of recurring) {
    if (income.frequency !== 'biweekly') {
      continue;
    }
    const key = `${income.description}|${income.amount}|${income.paymentMethodId}|${income.category}`;
    const existing = biweeklySources.get(key);
    if (!existing || income.date < existing.date) {
      biweeklySources.set(key, income);
    }
  }

  for (const source of biweeklySources.values()) {
    const { id: _id, ...rest } = source;
    const anchorDate = shiftByOneMonth(source.date, targetMonth, targetYear);
    const secondDate = addDays(anchorDate, 15);

    copies.push({
      ...rest,
      date: anchorDate,
      month: targetMonth,
      year: targetYear,
      status: 'expected',
    });
    copies.push({
      ...rest,
      date: secondDate,
      month: parseIsoDate(secondDate).getMonth() + 1,
      year: parseIsoDate(secondDate).getFullYear(),
      status: 'expected',
    });
  }

  return copies;
}

function shiftByOneMonth(
  isoDate: string,
  targetMonth: number,
  targetYear: number,
): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3) {
    return isoDate;
  }
  const day = Math.min(parts[2], lastDayOfMonth(targetYear, targetMonth));
  const mm = String(targetMonth).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${targetYear}-${mm}-${dd}`;
}
