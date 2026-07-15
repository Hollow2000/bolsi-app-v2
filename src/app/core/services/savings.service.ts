import { Injectable } from '@angular/core';

import { database } from '../database/bolsi.database';
import type { SavingsAccount, SavingFrequency, ScheduledSavingConfig } from '../models/savings-account.model';
import type { SavingsTransaction } from '../models/savings-transaction.model';
import type { SavingsExecution } from '../models/savings-execution.model';

export interface PendingScheduledSaving {
  account: SavingsAccount;
  config: ScheduledSavingConfig;
  occurrences: number;
  executedCount: number;
  pendingAmount: number;
}

@Injectable({ providedIn: 'root' })
export class SavingsService {
  async getAll(): Promise<SavingsAccount[]> {
    return database.savingsAccounts.toArray();
  }

  async getById(id: number): Promise<SavingsAccount | undefined> {
    return database.savingsAccounts.get(id);
  }

  async create(account: Omit<SavingsAccount, 'id'>): Promise<number> {
    const id = await database.savingsAccounts.add(account as SavingsAccount);
    return id as number;
  }

  async update(id: number, updates: Partial<SavingsAccount>): Promise<void> {
    await database.savingsAccounts.update(id, updates);
  }

  async delete(id: number): Promise<void> {
    await database.savingsTransactions.where('savingsId').equals(id).delete();
    await database.savingsAccounts.delete(id);
  }

  async getTransactions(savingsId: number): Promise<SavingsTransaction[]> {
    return database.savingsTransactions
      .where('savingsId')
      .equals(savingsId)
      .reverse()
      .sortBy('date');
  }

  async deposit(savingsId: number, amount: number, originPaymentMethodId: number, description?: string): Promise<void> {
    const account = await database.savingsAccounts.get(savingsId);
    if (!account) {
      throw new Error('Cuenta de ahorro no encontrada.');
    }
    const origin = await database.paymentMethods.get(originPaymentMethodId);
    if (!origin) {
      throw new Error('Cuenta de origen no encontrada.');
    }
    const available = origin.currentBalance ?? 0;
    if (amount > available) {
      throw new Error('El monto excede el saldo disponible de la cuenta de origen.');
    }
    await database.paymentMethods.update(originPaymentMethodId, {
      currentBalance: available - amount,
    });
    await database.savingsTransactions.add({
      savingsId,
      amount,
      type: 'deposit',
      date: new Date(),
      description,
      paymentMethodId: originPaymentMethodId,
    });
    await database.savingsAccounts.update(savingsId, {
      balance: account.balance + amount,
    });

    // Add expense to pocket if configured
    if (account.pocketId) {
      const now = new Date();
      await database.expenses.add({
        date: this.toIsoDate(now),
        description: description || `Depósito a ${account.name}`,
        amount,
        paymentMethodId: originPaymentMethodId,
        pocketId: account.pocketId,
        category: 'Ahorro',
        icon: 'savings',
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        isInstallment: false,
      });
    }
  }

  async withdraw(savingsId: number, amount: number, destinationPaymentMethodId: number, description?: string): Promise<void> {
    const account = await database.savingsAccounts.get(savingsId);
    if (!account) {
      throw new Error('Cuenta de ahorro no encontrada.');
    }
    if (amount > account.balance) {
      throw new Error('El monto excede el saldo disponible.');
    }
    const destination = await database.paymentMethods.get(destinationPaymentMethodId);
    if (!destination) {
      throw new Error('Cuenta de destino no encontrada.');
    }
    await database.paymentMethods.update(destinationPaymentMethodId, {
      currentBalance: (destination.currentBalance ?? 0) + amount,
    });
    await database.savingsTransactions.add({
      savingsId,
      amount,
      type: 'withdrawal',
      date: new Date(),
      description,
      paymentMethodId: destinationPaymentMethodId,
    });
    await database.savingsAccounts.update(savingsId, {
      balance: account.balance - amount,
    });

    // Subtract from pocket if configured (negative expense)
    if (account.pocketId) {
      const now = new Date();
      await database.expenses.add({
        date: this.toIsoDate(now),
        description: description || `Retiro de ${account.name}`,
        amount: -amount,
        paymentMethodId: destinationPaymentMethodId,
        pocketId: account.pocketId,
        category: 'Ahorro',
        icon: 'savings',
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        isInstallment: false,
      });
    }
  }

  async addYield(savingsId: number, amount: number): Promise<void> {
    const account = await database.savingsAccounts.get(savingsId);
    if (!account) {
      throw new Error('Cuenta de ahorro no encontrada.');
    }
    await database.savingsTransactions.add({
      savingsId,
      amount,
      type: 'yield',
      date: new Date(),
    });
    await database.savingsAccounts.update(savingsId, {
      balance: account.balance + amount,
    });
  }

  async getTotalBalance(): Promise<number> {
    const accounts = await database.savingsAccounts.toArray();
    return accounts.reduce((sum, account) => sum + account.balance, 0);
  }

  async getAccountSummary(savingsId: number): Promise<{
    totalDeposits: number;
    totalWithdrawals: number;
    totalYields: number;
  }> {
    const transactions = await database.savingsTransactions
      .where('savingsId')
      .equals(savingsId)
      .toArray();
    return transactions.reduce(
      (summary, transaction) => {
        if (transaction.type === 'deposit') {
          summary.totalDeposits += transaction.amount;
        } else if (transaction.type === 'withdrawal') {
          summary.totalWithdrawals += transaction.amount;
        } else if (transaction.type === 'yield') {
          summary.totalYields += transaction.amount;
        }
        return summary;
      },
      { totalDeposits: 0, totalWithdrawals: 0, totalYields: 0 },
    );
  }

  async hasYieldThisMonth(savingsId: number): Promise<boolean> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const transactions = await database.savingsTransactions
      .where('savingsId')
      .equals(savingsId)
      .toArray();
    return transactions.some((t) => {
      if (t.type !== 'yield') return false;
      const date = new Date(t.date);
      return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
    });
  }

  calculateOccurrences(frequency: SavingFrequency): number {
    switch (frequency) {
      case 'monthly': return 1;
      case 'biweekly': return 2;
      case 'weekly': return 4;
      default: return 1;
    }
  }

  async getExecutionsForMonth(month: number, year: number): Promise<SavingsExecution[]> {
    return database.savingsExecutions
      .where('[month+year]')
      .equals([month, year])
      .toArray();
  }

  async getAccountsScheduledForMonth(month: number, year: number): Promise<PendingScheduledSaving[]> {
    const allAccounts = await database.savingsAccounts.toArray();
    const executions = await this.getExecutionsForMonth(month, year);
    const result: PendingScheduledSaving[] = [];

    for (const account of allAccounts) {
      const config = account.scheduledSaving;
      if (!config || !config.isActive) continue;

      const occurrences = this.calculateOccurrences(config.frequency);
      const executedCount = executions.filter(
        (e) => e.savingsAccountId === account.id,
      ).length;
      const pending = occurrences - executedCount;

      if (pending > 0) {
        result.push({
          account,
          config,
          occurrences,
          executedCount,
          pendingAmount: pending * config.amount,
        });
      }
    }

    return result;
  }

  async getTotalPendingScheduledForMonth(month: number, year: number): Promise<number> {
    const pending = await this.getAccountsScheduledForMonth(month, year);
    return pending.reduce((sum, p) => sum + p.pendingAmount, 0);
  }

  async executeScheduledSaving(savingsAccountId: number, month: number, year: number, occurrenceIndex: number): Promise<void> {
    const account = await database.savingsAccounts.get(savingsAccountId);
    if (!account) {
      throw new Error('Cuenta de ahorro no encontrada.');
    }
    const config = account.scheduledSaving;
    if (!config) {
      throw new Error('Esta cuenta no tiene ahorro programado configurado.');
    }

    await this.deposit(
      savingsAccountId,
      config.amount,
      config.paymentMethodId,
      `Ahorro programado: ${account.name}`,
    );

    await database.savingsExecutions.add({
      savingsAccountId,
      month,
      year,
      occurrenceIndex,
      executedDate: new Date().toISOString().split('T')[0],
      amount: config.amount,
    });
  }

  async getDueScheduledSavings(month: number, year: number): Promise<PendingScheduledSaving[]> {
    const pending = await this.getAccountsScheduledForMonth(month, year);
    return pending.filter((p) => p.executedCount < p.occurrences);
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
