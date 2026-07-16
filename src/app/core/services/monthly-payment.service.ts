import { Injectable, inject } from '@angular/core';

import { database } from '../database/bolsi.database';
import type { MonthlyPayment } from '../models/monthly-payment.model';
import { ExpenseService } from './expense.service';
import { PaymentMethodService } from './payment-method.service';
import { TransferService } from './transfer.service';

@Injectable({ providedIn: 'root' })
export class MonthlyPaymentService {
  private readonly paymentMethods = inject(PaymentMethodService);
  private readonly expenseService = inject(ExpenseService);
  private readonly transferService = inject(TransferService);

  async create(payment: MonthlyPayment): Promise<number> {
    this.validate(payment);
    const id = await database.monthlyPayments.add(payment);
    return id as number;
  }

  async getByMonth(month: number, year: number): Promise<MonthlyPayment[]> {
    const all = await database.monthlyPayments.toArray();
    return all
      .filter((payment) => payment.month === month && payment.year === year)
      .sort((a, b) => this.urgencyRank(a) - this.urgencyRank(b) || a.dueDate.localeCompare(b.dueDate));
  }

  async getById(id: number): Promise<MonthlyPayment | undefined> {
    return database.monthlyPayments.get(id);
  }

  async update(payment: MonthlyPayment): Promise<void> {
    if (payment.id === undefined) {
      throw new Error('No se puede actualizar un pago sin identificador.');
    }
    this.validate(payment);
    await database.monthlyPayments.put(payment);
  }

  async delete(id: number): Promise<void> {
    await database.monthlyPayments.delete(id);
  }

  /**
   * BR-07: marking a monthly payment as paid:
   *   1. Sets `paid = true` and `amountPaid`.
   *   2. If the payment is linked to a credit card → performs a
   *      transfer (source → card) so availableCredit increases.
   *   3. Otherwise → creates an Expense that deducts from the source
   *      account (rent, utilities, etc.).
   */
  async markAsPaid(
    payment: MonthlyPayment,
    amountPaid: number,
    sourcePaymentMethodId: number,
  ): Promise<void> {
    if (payment.id === undefined) {
      throw new Error('No se puede marcar como pagado un pago sin identificador.');
    }
    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      throw new Error('El monto a pagar debe ser mayor a 0.');
    }
    const source = await this.paymentMethods.getById(sourcePaymentMethodId);
    if (!source) {
      throw new Error('El método de pago seleccionado no existe.');
    }
    if (source.type === 'credit') {
      throw new Error('Para pagar, selecciona una cuenta de efectivo o débito.');
    }

    // Validate sufficient balance
    const available = source.currentBalance ?? 0;
    if (amountPaid > available) {
      throw new Error(`Saldo insuficiente. Disponible: ${available.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}`);
    }

    // 1. Mark the monthly payment as paid.
    const updated: MonthlyPayment = {
      ...payment,
      paid: true,
      amountPaid,
    };
    await database.monthlyPayments.put(updated);

    // 2. Check if the payment is linked to a credit card.
    const linkedMethod = payment.paymentMethodId !== undefined
      ? await this.paymentMethods.getById(payment.paymentMethodId)
      : undefined;

    if (linkedMethod?.type === 'credit') {
      // Credit card payment → transfer from source to card.
      // Increases availableCredit (paying off the card frees credit).
      await this.transferService.create({
        fromPaymentMethodId: sourcePaymentMethodId,
        toPaymentMethodId: payment.paymentMethodId!,
        amount: amountPaid,
        date: this.todayIso(),
        description: payment.name,
        month: payment.month,
        year: payment.year,
      });
    } else {
      // Non-credit payment (rent, utilities, etc.) → expense.
      await this.expenseService.create({
        date: this.todayIso(),
        description: payment.name,
        amount: amountPaid,
        paymentMethodId: sourcePaymentMethodId,
        pocketId: payment.pocketId ?? 0,
        category: payment.expenseCategory ?? 'Other',
        month: payment.month,
        year: payment.year,
        isInstallment: false,
      });
    }
  }

  /**
   * BR-11: when a month closes, every `isRecurring` payment of that
   * month is copied into the next month with `paid = false`,
   * `amountPaid = 0` and the due date rolled forward.
   * Payment-method balances are intentionally left untouched.
   * Supports monthly, biweekly, and weekly frequencies.
   */
  async replicateRecurring(
    originMonth: number,
    originYear: number,
    targetMonth: number,
    targetYear: number,
  ): Promise<number> {
    const all = await database.monthlyPayments.toArray();
    const recurring = all.filter(
      (payment) => payment.isRecurring && payment.month === originMonth && payment.year === originYear,
    );
    if (recurring.length === 0) {
      return 0;
    }

    const copies: MonthlyPayment[] = [];

    for (const payment of recurring) {
      const { id: _id, ...rest } = payment;
      const frequency = payment.frequency ?? 'monthly';

      if (frequency === 'biweekly') {
        // Create 2 copies: one for first half (day 1-15), one for second half (day 16-31)
        const baseDay = this.extractDay(payment.dueDate);
        const firstDay = Math.min(baseDay, 15);
        const secondDay = Math.min(baseDay + 15, this.lastDayOfMonth(targetYear, targetMonth));

        copies.push({
          ...rest,
          paid: false,
          amountPaid: 0,
          dueDate: this.buildDate(targetYear, targetMonth, firstDay),
          month: targetMonth,
          year: targetYear,
          frequency: 'biweekly',
        });
        copies.push({
          ...rest,
          paid: false,
          amountPaid: 0,
          dueDate: this.buildDate(targetYear, targetMonth, secondDay),
          month: targetMonth,
          year: targetYear,
          frequency: 'biweekly',
        });
      } else if (frequency === 'weekly') {
        // Create 4 copies: one for each week of the month
        const baseDay = this.extractDay(payment.dueDate);
        for (let week = 0; week < 4; week++) {
          const day = Math.min(baseDay + (week * 7), this.lastDayOfMonth(targetYear, targetMonth));
          copies.push({
            ...rest,
            paid: false,
            amountPaid: 0,
            dueDate: this.buildDate(targetYear, targetMonth, day),
            month: targetMonth,
            year: targetYear,
            frequency: 'weekly',
          });
        }
      } else {
        // Monthly: single copy
        copies.push({
          ...rest,
          paid: false,
          amountPaid: 0,
          dueDate: this.shiftDueDateByOneMonth(payment.dueDate, targetMonth, targetYear),
          month: targetMonth,
          year: targetYear,
          frequency: 'monthly',
        });
      }
    }

    await database.monthlyPayments.bulkAdd(copies);
    return copies.length;
  }

  private validate(payment: MonthlyPayment): void {
    if (!payment.name.trim()) {
      throw new Error('El nombre del pago es obligatorio.');
    }
    if (!Number.isFinite(payment.amount) || payment.amount <= 0) {
      throw new Error('El monto del pago debe ser mayor a 0.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payment.dueDate)) {
      throw new Error('La fecha de vencimiento debe tener el formato YYYY-MM-DD.');
    }
    if (!Number.isInteger(payment.month) || payment.month < 1 || payment.month > 12) {
      throw new Error('El mes del pago debe estar entre 1 y 12.');
    }
    if (!Number.isInteger(payment.year) || payment.year < 1900 || payment.year > 9999) {
      throw new Error('El año del pago no es válido.');
    }
  }

  private urgencyRank(payment: MonthlyPayment): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(`${payment.dueDate}T00:00:00`);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (payment.paid) return 1000;
    if (diffDays < 0) return 0;
    if (diffDays <= 3) return 1;
    if (diffDays <= 7) return 2;
    return 3;
  }

  private shiftDueDateByOneMonth(dueDate: string, targetMonth: number, targetYear: number): string {
    const parts = dueDate.split('-').map((segment) => Number(segment));
    if (parts.length !== 3) {
      return dueDate;
    }
    const day = parts[2];
    const lastDayOfTarget = new Date(targetYear, targetMonth, 0).getDate();
    const safeDay = Math.min(day, lastDayOfTarget);
    const mm = String(targetMonth).padStart(2, '0');
    const dd = String(safeDay).padStart(2, '0');
    return `${targetYear}-${mm}-${dd}`;
  }

  private extractDay(dateStr: string): number {
    const parts = dateStr.split('-').map(Number);
    return parts.length === 3 ? parts[2] : 1;
  }

  private buildDate(year: number, month: number, day: number): string {
    const safeDay = Math.min(day, this.lastDayOfMonth(year, month));
    const mm = String(month).padStart(2, '0');
    const dd = String(safeDay).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  private lastDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }

  private todayIso(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
