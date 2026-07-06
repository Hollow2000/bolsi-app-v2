import { Injectable } from '@angular/core';

import { database } from '../database/bolsi.database';
import type { PaymentMethod } from '../models/payment-method.model';

@Injectable({ providedIn: 'root' })
export class PaymentMethodService {
  async getAll(): Promise<PaymentMethod[]> {
    return database.paymentMethods.toArray();
  }

  async getById(id: number): Promise<PaymentMethod | undefined> {
    return database.paymentMethods.get(id);
  }

  async create(paymentMethod: PaymentMethod): Promise<number> {
    const id = await database.paymentMethods.add(paymentMethod);
    return id as number;
  }

  async update(paymentMethod: PaymentMethod): Promise<void> {
    await database.paymentMethods.put(paymentMethod);
  }

  async delete(id: number): Promise<void> {
    await database.paymentMethods.delete(id);
  }

  async deductBalance(id: number, amount: number): Promise<void> {
    const paymentMethod = await this.getById(id);
    if (!paymentMethod) {
      return;
    }
    if (paymentMethod.type === 'cash' || paymentMethod.type === 'debit') {
      paymentMethod.currentBalance = (paymentMethod.currentBalance ?? 0) - amount;
    } else {
      paymentMethod.availableCredit = (paymentMethod.availableCredit ?? 0) - amount;
    }
    await this.update(paymentMethod);
  }

  async addBalance(id: number, amount: number): Promise<void> {
    const paymentMethod = await this.getById(id);
    if (!paymentMethod) {
      return;
    }
    if (paymentMethod.type === 'cash' || paymentMethod.type === 'debit') {
      paymentMethod.currentBalance = (paymentMethod.currentBalance ?? 0) + amount;
    } else {
      paymentMethod.availableCredit = (paymentMethod.availableCredit ?? 0) + amount;
    }
    await this.update(paymentMethod);
  }
}
