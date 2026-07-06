import { Injectable, inject } from '@angular/core';

import { database } from '../database/bolsi.database';
import type { MonthlyPayment } from '../models/monthly-payment.model';
import { ExpenseService } from './expense.service';

/**
 * Minimal monthly-payment service. The full implementation — including
 * `markAsPaid` with the BR-07 auto-expense and `replicateRecurring` — is
 * scheduled for PHASE 4. For now, this service covers:
 *
 *  - creating a payment (e.g. a credit card bill registered as a
 *    monthly obligation);
 *  - listing the payments of a given month;
 *  - keeping the table healthy.
 */
@Injectable({ providedIn: 'root' })
export class MonthlyPaymentService {
  private readonly expenseService = inject(ExpenseService);

  async create(payment: MonthlyPayment): Promise<number> {
    if (!payment.name.trim()) {
      throw new Error('El nombre del pago es obligatorio.');
    }
    if (!Number.isFinite(payment.amount) || payment.amount <= 0) {
      throw new Error('El monto del pago debe ser mayor a 0.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payment.dueDate)) {
      throw new Error('La fecha de vencimiento debe tener el formato YYYY-MM-DD.');
    }
    const id = await database.monthlyPayments.add(payment);
    return id as number;
  }

  async getByMonth(month: number, year: number): Promise<MonthlyPayment[]> {
    const all = await database.monthlyPayments.toArray();
    return all
      .filter((payment) => payment.month === month && payment.year === year)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  async getById(id: number): Promise<MonthlyPayment | undefined> {
    return database.monthlyPayments.get(id);
  }

  async update(payment: MonthlyPayment): Promise<void> {
    if (payment.id === undefined) {
      throw new Error('No se puede actualizar un pago sin identificador.');
    }
    await database.monthlyPayments.put(payment);
  }

  async delete(id: number): Promise<void> {
    await database.monthlyPayments.delete(id);
  }
}
