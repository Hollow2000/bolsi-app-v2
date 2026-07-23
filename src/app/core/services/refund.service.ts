import { Injectable } from '@angular/core';

import { database } from '../database/bolsi.database';
import type { Refund } from '../models/refund.model';

@Injectable({ providedIn: 'root' })
export class RefundService {
  async create(refund: Omit<Refund, 'id'>): Promise<number> {
    const id = await database.refunds.add(refund as Refund);

    // Mark expense as refunded
    await database.expenses.update(refund.expenseId, { refunded: true });

    // Update destination payment method balance
    const destinationId = refund.refundPaymentMethodId ?? refund.originalPaymentMethodId;
    const destination = await database.paymentMethods.get(destinationId);

    if (destination) {
      if (destination.type === 'credit') {
        await database.paymentMethods.update(destination.id!, {
          availableCredit: (destination.availableCredit ?? 0) + refund.amount,
        });
      } else {
        await database.paymentMethods.update(destination.id!, {
          currentBalance: (destination.currentBalance ?? 0) + refund.amount,
        });
      }
    }

    return id as number;
  }

  async getByExpenseId(expenseId: number): Promise<Refund | undefined> {
    return database.refunds
      .where('expenseId')
      .equals(expenseId)
      .first();
  }

  async getByMonth(month: number, year: number): Promise<Refund[]> {
    return database.refunds
      .where('[month+year]')
      .equals([month, year])
      .toArray();
  }

  async getByPaymentMethod(paymentMethodId: number): Promise<Refund[]> {
    return database.refunds
      .where('originalPaymentMethodId')
      .equals(paymentMethodId)
      .toArray();
  }

  async getTotalByPaymentMethod(paymentMethodId: number, month: number, year: number): Promise<number> {
    const refunds = await database.refunds
      .where('originalPaymentMethodId')
      .equals(paymentMethodId)
      .toArray();
    return refunds
      .filter((r) => r.month === month && r.year === year)
      .reduce((sum, r) => sum + r.amount, 0);
  }

  async delete(id: number): Promise<void> {
    const refund = await database.refunds.get(id);
    if (!refund) return;

    // Revert the balance change
    const destinationId = refund.refundPaymentMethodId ?? refund.originalPaymentMethodId;
    const destination = await database.paymentMethods.get(destinationId);

    if (destination) {
      if (destination.type === 'credit') {
        await database.paymentMethods.update(destination.id!, {
          availableCredit: (destination.availableCredit ?? 0) - refund.amount,
        });
      } else {
        await database.paymentMethods.update(destination.id!, {
          currentBalance: (destination.currentBalance ?? 0) - refund.amount,
        });
      }
    }

    // Unmark expense as refunded
    await database.expenses.update(refund.expenseId, { refunded: false });

    // Delete the refund
    await database.refunds.delete(id);
  }
}
