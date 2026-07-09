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
   * Moves money from one payment method to another.
   *
   * When the destination is a credit card:
   * - Before cutoff: normal transfer, marks installments for current month as paid
   * - After cutoff: splits into payment (reduces statementBalance) + surplus
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

    if (to.type === 'credit' && to.statementClosingDay !== undefined) {
      const today = new Date();
      const closingDay = to.statementClosingDay;

      if (today.getDate() >= closingDay && (to.statementBalance ?? 0) > 0) {
        // After cutoff: handle as payment + possible surplus
        const billingPeriod = this.getCutoffPeriod(closingDay, today);
        const existingPayments = await this.getCreditCardPayments(
          to.id!,
          billingPeriod.month,
          billingPeriod.year,
        );
        const remainingToPay = Math.max(0, (to.statementBalance ?? 0) - existingPayments);

        if (remainingToPay > 0) {
          const paymentAmount = Math.min(transfer.amount, remainingToPay);
          const surplus = transfer.amount - paymentAmount;

          // Create credit card payment record
          const paymentTransfer: Transfer = {
            fromPaymentMethodId: transfer.fromPaymentMethodId,
            toPaymentMethodId: transfer.toPaymentMethodId,
            amount: paymentAmount,
            date: transfer.date,
            description: transfer.description,
            month: transfer.month,
            year: transfer.year,
            isCreditCardPayment: true,
            billingPeriodMonth: billingPeriod.month,
            billingPeriodYear: billingPeriod.year,
          };
          await database.transfers.add(paymentTransfer);

          // If surplus, create a normal transfer for it
          if (surplus > 0) {
            const surplusTransfer: Transfer = {
              fromPaymentMethodId: transfer.fromPaymentMethodId,
              toPaymentMethodId: transfer.toPaymentMethodId,
              amount: surplus,
              date: transfer.date,
              description: `${transfer.description} (sobrante)`,
              month: transfer.month,
              year: transfer.year,
            };
            await database.transfers.add(surplusTransfer);
          }

          // Mark installments for the billing period as paid
          await this.markInstallmentsPaid(to.id!, billingPeriod.month, billingPeriod.year);

          return paymentAmount;
        }
      }

      // Before cutoff or no statementBalance: normal transfer
      await this.markInstallmentsPaid(to.id!, transfer.month, transfer.year);
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

  /**
   * Returns credit card payment transfers for a specific billing period.
   */
  async getCreditCardPayments(
    cardId: number,
    billingPeriodMonth: number,
    billingPeriodYear: number,
  ): Promise<number> {
    const all = await database.transfers.toArray();
    return all
      .filter(
        (transfer) =>
          transfer.toPaymentMethodId === cardId &&
          transfer.isCreditCardPayment &&
          transfer.billingPeriodMonth === billingPeriodMonth &&
          transfer.billingPeriodYear === billingPeriodYear,
      )
      .reduce((sum, transfer) => sum + transfer.amount, 0);
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

  private getCutoffPeriod(closingDay: number, today: Date): { month: number; year: number } {
    if (today.getDate() >= closingDay) {
      const nextMonth = today.getMonth() + 2;
      if (nextMonth > 12) {
        return { month: nextMonth - 12, year: today.getFullYear() + 1 };
      }
      return { month: nextMonth, year: today.getFullYear() };
    }
    return { month: today.getMonth() + 1, year: today.getFullYear() };
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
