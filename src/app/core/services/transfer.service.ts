import { Injectable, inject } from '@angular/core';

import { database } from '../database/bolsi.database';
import type { Transfer } from '../models/transfer.model';
import { PaymentMethodService } from './payment-method.service';

@Injectable({ providedIn: 'root' })
export class TransferService {
  private readonly paymentMethods = inject(PaymentMethodService);

  async getByMonth(month: number, year: number): Promise<Transfer[]> {
    const all = await database.transfers.toArray();
    return all
      .filter((transfer) => transfer.month === month && transfer.year === year)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Moves money from one payment method to another. Both balances are
   * updated atomically and a Transfer record is persisted for history.
   *
   * For credit-card destinations the money increases `availableCredit`
   * (paying off the card frees credit). For cash / debit destinations
   * the money increases `currentBalance`.
   */
  async create(transfer: Transfer): Promise<number> {
    this.validate(transfer);
    if (transfer.fromPaymentMethodId === transfer.toPaymentMethodId) {
      throw new Error('El origen y el destino no pueden ser la misma cuenta.');
    }
    const from = await this.paymentMethods.getById(transfer.fromPaymentMethodId);
    const to = await this.paymentMethods.getById(transfer.toPaymentMethodId);
    if (!from) throw new Error('La cuenta de origen no existe.');
    if (!to) throw new Error('La cuenta de destino no existe.');

    await this.paymentMethods.deductBalance(transfer.fromPaymentMethodId, transfer.amount);
    await this.paymentMethods.addBalance(transfer.toPaymentMethodId, transfer.amount);

    const id = await database.transfers.add(transfer);
    return id as number;
  }

  async delete(id: number): Promise<void> {
    const transfer = await database.transfers.get(id);
    if (!transfer) return;
    await this.paymentMethods.addBalance(transfer.fromPaymentMethodId, transfer.amount);
    await this.paymentMethods.deductBalance(transfer.toPaymentMethodId, transfer.amount);
    await database.transfers.delete(id);
  }

  private validate(transfer: Transfer): void {
    if (!Number.isFinite(transfer.amount) || transfer.amount <= 0) {
      throw new Error('El monto debe ser mayor a 0.');
    }
    if (!transfer.description.trim()) {
      throw new Error('La descripción es obligatoria.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(transfer.date)) {
      throw new Error('La fecha debe tener el formato YYYY-MM-DD.');
    }
  }
}
