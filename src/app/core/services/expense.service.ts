import { Injectable, inject } from '@angular/core';

import { database } from '../database/bolsi.database';
import type { Expense } from '../models/expense.model';
import { InstallmentPlanService } from './installment-plan.service';
import { PocketService } from './pocket.service';
import { PaymentMethodService } from './payment-method.service';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly paymentMethods = inject(PaymentMethodService);
  private readonly pockets = inject(PocketService);
  private readonly installmentPlans = inject(InstallmentPlanService);

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
    this.assertValidFields(expense);
    const method = await this.assertPaymentMethodExists(expense.paymentMethodId);
    await this.assertPocketExists(expense.pocketId);

    if (expense.isInstallment) {
      if (method.type !== 'credit') {
        throw new Error('Las cuotas solo aplican a tarjetas de crédito.');
      }
      this.assertInstallmentFields(expense);
    }

    if (method.type === 'credit') {
      const available = method.availableCredit ?? 0;
      if (expense.amount > available) {
        throw new Error('El gasto excede el crédito disponible de la tarjeta.');
      }
      await this.paymentMethods.deductBalance(expense.paymentMethodId, expense.amount);
    } else {
      await this.paymentMethods.deductBalance(expense.paymentMethodId, expense.amount);
    }

    const id = await database.expenses.add(expense) as number;
    const stored = { ...expense, id };

    if (expense.isInstallment && method.type === 'credit') {
      // Register hidden refund to cancel the upfront deduction.
      // The installment plans will track the debt progressively.
      const refund: Expense = {
        date: expense.date,
        description: `Reembolso: ${expense.description}`,
        amount: expense.amount,
        paymentMethodId: expense.paymentMethodId,
        pocketId: expense.pocketId,
        category: expense.category,
        month: expense.month,
        year: expense.year,
        isInstallment: false,
        hidden: true,
      };
      await database.expenses.add(refund);
      await this.paymentMethods.addBalance(expense.paymentMethodId, expense.amount);

      // Generate installment plans
      await this.installmentPlans.generatePlans(stored, method);

      // Mark past installments as paid if purchase is from a past month
      const purchaseDate = this.parseIsoDate(expense.date);
      const plans = await this.installmentPlans.getActiveByExpense(id);
      await this.installmentPlans.markPastAsPaid(plans, purchaseDate);
    }

    return id;
  }

  async update(previous: Expense, updated: Expense): Promise<void> {
    if (previous.id === undefined) {
      throw new Error('No se puede actualizar un gasto sin identificador.');
    }
    this.assertValidFields(updated);
    const method = await this.assertPaymentMethodExists(updated.paymentMethodId);
    await this.assertPocketExists(updated.pocketId);
    if (updated.isInstallment) {
      if (method.type !== 'credit') {
        throw new Error('Las cuotas solo aplican a tarjetas de crédito.');
      }
      this.assertInstallmentFields(updated);
    }

    // Reverse the previous balance effect.
    await this.paymentMethods.addBalance(previous.paymentMethodId, previous.amount);
    if (previous.isInstallment) {
      await this.installmentPlans.deleteByExpense(previous.id);
    }

    if (method.type === 'credit') {
      const available = method.availableCredit ?? 0;
      if (updated.amount > available) {
        throw new Error('El gasto actualizado excede el crédito disponible de la tarjeta.');
      }
    }
    await this.paymentMethods.deductBalance(updated.paymentMethodId, updated.amount);

    const stored = { ...updated, id: previous.id };
    await database.expenses.put(stored);

    if (updated.isInstallment) {
      await this.installmentPlans.generatePlans(stored, method);
    }
  }

  async delete(expense: Expense): Promise<void> {
    if (expense.id === undefined) {
      return;
    }
    if (expense.isInstallment) {
      // Delete the hidden refund expense
      const allExpenses = await database.expenses.toArray();
      const refund = allExpenses.find(
        (e) => e.hidden && e.description === `Reembolso: ${expense.description}` &&
          e.paymentMethodId === expense.paymentMethodId && e.amount === expense.amount,
      );
      if (refund?.id !== undefined) {
        await database.expenses.delete(refund.id);
        await this.paymentMethods.deductBalance(expense.paymentMethodId, expense.amount);
      }
      await this.installmentPlans.deleteByExpense(expense.id);
    }
    await this.paymentMethods.addBalance(expense.paymentMethodId, expense.amount);
    await database.expenses.delete(expense.id);
  }

  async getHiddenByCard(paymentMethodId: number): Promise<Expense[]> {
    const all = await database.expenses.toArray();
    return all
      .filter((expense) => expense.paymentMethodId === paymentMethodId && expense.hidden)
      .sort((a, b) => b.date.localeCompare(a.date));
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

  private assertInstallmentFields(expense: Expense): void {
    if (!expense.installmentMonths || expense.installmentMonths < 2) {
      throw new Error('Indica al menos 2 meses para cuotas.');
    }
    if (expense.installmentMonths > 48) {
      throw new Error('El número máximo de cuotas es 48.');
    }
  }

  private async assertPaymentMethodExists(id: number) {
    const method = await this.paymentMethods.getById(id);
    if (!method) {
      throw new Error('El método de pago seleccionado no existe.');
    }
    return method;
  }

  private async assertPocketExists(id: number): Promise<void> {
    const pocket = await this.pockets.getAll();
    if (!pocket.some((p) => p.id === id)) {
      throw new Error('El bolsillo seleccionado no existe.');
    }
  }

  private parseIsoDate(value: string): Date {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Fecha inválida: ${value}`);
    }
    return parsed;
  }
}
