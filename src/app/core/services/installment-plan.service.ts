import { Injectable } from '@angular/core';

import { database } from '../database/bolsi.database';
import type { Expense } from '../models/expense.model';
import type { InstallmentPlan } from '../models/installment-plan.model';
import type { PaymentMethod } from '../models/payment-method.model';

/**
 * Generates and queries `InstallmentPlan` records.
 *
 * The cutoff for the first installment follows BR-03:
 *   - if the purchase day is on or before the card's statement closing
 *     day, the first installment falls in the purchase month;
 *   - otherwise it falls in the following month.
 *
 * Every subsequent installment rolls forward one month, wrapping
 * over December (e.g. November + 2 = January next year).
 */
@Injectable({ providedIn: 'root' })
export class InstallmentPlanService {
  async generatePlans(expense: Expense, card: PaymentMethod): Promise<void> {
    if (expense.id === undefined) {
      throw new Error('El gasto debe estar guardado antes de generar cuotas.');
    }
    if (!expense.isInstallment || !expense.installmentMonths || expense.installmentMonths < 2) {
      throw new Error('El gasto no es a cuotas.');
    }
    if (card.type !== 'credit') {
      throw new Error('Las cuotas solo aplican a tarjetas de crédito.');
    }
    if (card.statementClosingDay === undefined || card.id === undefined) {
      throw new Error('La tarjeta no tiene día de corte definido.');
    }

    const purchaseDate = this.parseIsoDate(expense.date);
    const firstCutoff = this.calculateFirstCutoff(purchaseDate, card.statementClosingDay);
    const monthlyAmount = expense.amount / expense.installmentMonths;

    const plans: InstallmentPlan[] = [];
    for (let i = 0; i < expense.installmentMonths; i++) {
      const monthIndex = firstCutoff.month - 1 + i;
      const cutoffYear = firstCutoff.year + Math.floor(monthIndex / 12);
      const cutoffMonth = (monthIndex % 12) + 1;
      plans.push({
        expenseOriginId: expense.id,
        paymentMethodId: card.id,
        installmentNumber: i + 1,
        totalInstallments: expense.installmentMonths,
        amount: this.roundCurrency(monthlyAmount),
        cutoffMonth,
        cutoffYear,
        paid: false,
      });
    }

    await database.installmentPlans.bulkAdd(plans);
  }

  async getByCardAndMonth(
    paymentMethodId: number,
    month: number,
    year: number,
  ): Promise<InstallmentPlan[]> {
    const all = await database.installmentPlans.toArray();
    return all
      .filter(
        (plan) =>
          plan.paymentMethodId === paymentMethodId &&
          plan.cutoffMonth === month &&
          plan.cutoffYear === year,
      )
      .sort((a, b) => a.installmentNumber - b.installmentNumber);
  }

  async getActiveByExpense(expenseOriginId: number): Promise<InstallmentPlan[]> {
    const all = await database.installmentPlans.toArray();
    return all
      .filter((plan) => plan.expenseOriginId === expenseOriginId)
      .sort((a, b) => a.installmentNumber - b.installmentNumber);
  }

  async getUpcomingByCard(paymentMethodId: number, fromMonth: number, fromYear: number): Promise<InstallmentPlan[]> {
    const all = await database.installmentPlans.toArray();
    return all
      .filter((plan) => {
        if (plan.paymentMethodId !== paymentMethodId) return false;
        if (plan.paid) return false;
        if (plan.cutoffYear > fromYear) return true;
        if (plan.cutoffYear === fromYear && plan.cutoffMonth >= fromMonth) return true;
        return false;
      })
      .sort((a, b) => {
        if (a.cutoffYear !== b.cutoffYear) return a.cutoffYear - b.cutoffYear;
        return a.cutoffMonth - b.cutoffMonth;
      });
  }

  async deleteByExpense(expenseOriginId: number): Promise<void> {
    await database.installmentPlans
      .where('expenseOriginId')
      .equals(expenseOriginId)
      .delete();
  }

  async markPastAsPaid(plans: InstallmentPlan[], purchaseDate: Date): Promise<void> {
    const currentMonth = purchaseDate.getMonth() + 1;
    const currentYear = purchaseDate.getFullYear();
    for (const plan of plans) {
      if (plan.cutoffYear < currentYear || (plan.cutoffYear === currentYear && plan.cutoffMonth < currentMonth)) {
        if (plan.id !== undefined) {
          await database.installmentPlans.put({ ...plan, paid: true });
        }
      }
    }
  }

  async getById(id: number): Promise<InstallmentPlan | undefined> {
    return database.installmentPlans.get(id);
  }

  async updateAmount(id: number, newAmount: number): Promise<void> {
    const plan = await database.installmentPlans.get(id);
    if (!plan) {
      throw new Error('La cuota no existe.');
    }
    await database.installmentPlans.put({ ...plan, customAmount: this.roundCurrency(newAmount) });
  }

  async replicateAmount(expenseOriginId: number, newAmount: number): Promise<void> {
    const all = await database.installmentPlans
      .where('expenseOriginId')
      .equals(expenseOriginId)
      .toArray();
    const pending = all.filter((plan) => !plan.paid);
    for (const plan of pending) {
      await database.installmentPlans.put({ ...plan, customAmount: this.roundCurrency(newAmount) });
    }
  }

  private calculateFirstCutoff(purchaseDate: Date, closingDay: number): { month: number; year: number } {
    if (purchaseDate.getDate() <= closingDay) {
      return { month: purchaseDate.getMonth() + 1, year: purchaseDate.getFullYear() };
    }
    const nextMonthIndex = purchaseDate.getMonth() + 1;
    if (nextMonthIndex > 11) {
      return { month: 1, year: purchaseDate.getFullYear() + 1 };
    }
    return { month: nextMonthIndex + 1, year: purchaseDate.getFullYear() };
  }

  private parseIsoDate(value: string): Date {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Fecha inválida: ${value}`);
    }
    return parsed;
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
