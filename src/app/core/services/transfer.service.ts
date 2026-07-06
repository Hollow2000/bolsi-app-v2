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
   * When the destination is a credit card the transfer is a payment:
   *   1. `availableCredit` increases (paying off the card frees credit).
   *   2. Every `InstallmentPlan` whose cutoff matches the transfer's
   *      month and year is marked `paid = true` so the balance widget
   *      no longer counts it as billable debt (BR-04).
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

    // Credit-card payment: mark current-month installments as paid.
    if (to.type === 'credit') {
      await this.markInstallmentsPaid(transfer.toPaymentMethodId, transfer.month, transfer.year);
    }

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

  /**
   * Returns the total amount transferred TO a specific payment method
   * in a given month/year. Used by the credit-card detail to subtract
   * payments from the period charges display.
   */
  async getReceivedByMethodAndMonth(
    paymentMethodId: number,
    month: number,
    year: number,
  ): Promise<number> {
    const all = await database.transfers.toArray();
    return Math.round(
      all
        .filter(
          (transfer) =>
            transfer.toPaymentMethodId === paymentMethodId &&
            transfer.month === month &&
            transfer.year === year,
        )
        .reduce((sum, transfer) => sum + transfer.amount, 0) * 100,
    ) / 100;
  }

  private async markInstallmentsPaid(
    cardId: number,
    month: number,
    year: number,
  ): Promise<void> {
    const plans = await database.installmentPlans
      .where('paymentMethodId')
      .equals(cardId)
      .toArray();

    const toMark = plans.filter(
      (plan) => plan.cutoffMonth === month && plan.cutoffYear === year && !plan.paid,
    );

    for (const plan of toMark) {
      await database.installmentPlans.put({ ...plan, paid: true });
    }
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
