import { Injectable } from '@angular/core';

import { database } from '../database/bolsi.database';

export interface BackupPayload {
  readonly version: number;
  readonly exportedAt: string;
  readonly tables: {
    readonly paymentMethods: readonly unknown[];
    readonly expenses: readonly unknown[];
    readonly installmentPlans: readonly unknown[];
    readonly incomes: readonly unknown[];
    readonly pockets: readonly unknown[];
    readonly monthlyPayments: readonly unknown[];
    readonly budgets: readonly unknown[];
    readonly expenseTemplates: readonly unknown[];
    readonly appSettings: readonly unknown[];
  };
}

const BACKUP_VERSION = 1;

/**
 * Export the full Dexie database to a JSON file the user can download,
 * and import a previously-exported backup. Import replaces every
 * table's contents — the caller is responsible for confirming with
 * the user first.
 */
@Injectable({ providedIn: 'root' })
export class DataPortabilityService {
  async exportToFile(): Promise<void> {
    const payload = await this.collect();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bolsi-backup-${this.timestamp()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async importFromPayload(payload: BackupPayload): Promise<void> {
    if (payload.version !== BACKUP_VERSION) {
      throw new Error(`Versión de respaldo no soportada: ${payload.version}.`);
    }
    await database.transaction(
      'rw',
      [
        database.paymentMethods,
        database.expenses,
        database.installmentPlans,
        database.incomes,
        database.pockets,
        database.monthlyPayments,
        database.budgets,
        database.expenseTemplates,
        database.appSettings,
      ],
      async () => {
        await database.paymentMethods.clear();
        await database.expenses.clear();
        await database.installmentPlans.clear();
        await database.incomes.clear();
        await database.pockets.clear();
        await database.monthlyPayments.clear();
        await database.budgets.clear();
        await database.expenseTemplates.clear();
        await database.appSettings.clear();

        if (payload.tables.paymentMethods.length > 0) {
          await database.paymentMethods.bulkAdd(payload.tables.paymentMethods as never);
        }
        if (payload.tables.expenses.length > 0) {
          await database.expenses.bulkAdd(payload.tables.expenses as never);
        }
        if (payload.tables.installmentPlans.length > 0) {
          await database.installmentPlans.bulkAdd(payload.tables.installmentPlans as never);
        }
        if (payload.tables.incomes.length > 0) {
          await database.incomes.bulkAdd(payload.tables.incomes as never);
        }
        if (payload.tables.pockets.length > 0) {
          await database.pockets.bulkAdd(payload.tables.pockets as never);
        }
        if (payload.tables.monthlyPayments.length > 0) {
          await database.monthlyPayments.bulkAdd(payload.tables.monthlyPayments as never);
        }
        if (payload.tables.budgets.length > 0) {
          await database.budgets.bulkAdd(payload.tables.budgets as never);
        }
        if (payload.tables.expenseTemplates.length > 0) {
          await database.expenseTemplates.bulkAdd(payload.tables.expenseTemplates as never);
        }
        if (payload.tables.appSettings.length > 0) {
          await database.appSettings.bulkAdd(payload.tables.appSettings as never);
        }
      },
    );
  }

  async importFromFile(file: File): Promise<void> {
    const text = await file.text();
    const payload = JSON.parse(text) as BackupPayload;
    await this.importFromPayload(payload);
  }

  private async collect(): Promise<BackupPayload> {
    const [
      paymentMethods,
      expenses,
      installmentPlans,
      incomes,
      pockets,
      monthlyPayments,
      budgets,
      expenseTemplates,
      appSettings,
    ] = await Promise.all([
      database.paymentMethods.toArray(),
      database.expenses.toArray(),
      database.installmentPlans.toArray(),
      database.incomes.toArray(),
      database.pockets.toArray(),
      database.monthlyPayments.toArray(),
      database.budgets.toArray(),
      database.expenseTemplates.toArray(),
      database.appSettings.toArray(),
    ]);
    return {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      tables: {
        paymentMethods,
        expenses,
        installmentPlans,
        incomes,
        pockets,
        monthlyPayments,
        budgets,
        expenseTemplates,
        appSettings,
      },
    };
  }

  private timestamp(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}-${hours}${minutes}`;
  }
}
