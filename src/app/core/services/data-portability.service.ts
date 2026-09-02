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
    readonly savingsAccounts: readonly unknown[];
    readonly savingsTransactions: readonly unknown[];
    readonly savingsExecutions: readonly unknown[];
    readonly transfers: readonly unknown[];
    readonly refunds: readonly unknown[];
    readonly catalogs: readonly unknown[];
  };
}

const BACKUP_VERSION = 2;

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
    if (payload.version > BACKUP_VERSION) {
      throw new Error(`Versión de respaldo no soportada: ${payload.version}.`);
    }
    const rows = (table: keyof BackupPayload['tables']): readonly unknown[] =>
      payload.tables?.[table] ?? [];
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
        database.savingsAccounts,
        database.savingsTransactions,
        database.savingsExecutions,
        database.transfers,
        database.refunds,
        database.catalogs,
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
        await database.savingsAccounts.clear();
        await database.savingsTransactions.clear();
        await database.savingsExecutions.clear();
        await database.transfers.clear();
        await database.refunds.clear();
        await database.catalogs.clear();

        const mappings: Array<
          [keyof BackupPayload['tables'], { bulkAdd(items: readonly unknown[]): Promise<unknown> }]
        > = [
          ['paymentMethods', database.paymentMethods],
          ['expenses', database.expenses],
          ['installmentPlans', database.installmentPlans],
          ['incomes', database.incomes],
          ['pockets', database.pockets],
          ['monthlyPayments', database.monthlyPayments],
          ['budgets', database.budgets],
          ['expenseTemplates', database.expenseTemplates],
          ['appSettings', database.appSettings],
          ['savingsAccounts', database.savingsAccounts],
          ['savingsTransactions', database.savingsTransactions],
          ['savingsExecutions', database.savingsExecutions],
          ['transfers', database.transfers],
          ['refunds', database.refunds],
          ['catalogs', database.catalogs],
        ];
        for (const [key, table] of mappings) {
          const items = rows(key);
          if (items.length > 0) {
            await table.bulkAdd(this.normalizeRows(key, items) as never);
          }
        }
      },
    );
  }

  /**
   * JSON serialization turns `Date` values into ISO strings. Restore the
   * expected types so imported data behaves like data created in-app
   * (e.g. sorting by `.getTime()` or displaying via date pipes).
   */
  private normalizeRows(
    key: keyof BackupPayload['tables'],
    items: readonly unknown[],
  ): unknown[] {
    if (key === 'savingsAccounts') {
      return items.map((row) => {
        const account = row as { createdAt?: string | Date };
        if (typeof account.createdAt === 'string') {
          return { ...account, createdAt: new Date(account.createdAt) };
        }
        return account;
      });
    }
    if (key === 'savingsTransactions') {
      return items.map((row) => {
        const tx = row as { date?: string | Date };
        if (typeof tx.date === 'string') {
          return { ...tx, date: new Date(tx.date) };
        }
        return tx;
      });
    }
    return [...items];
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
      savingsAccounts,
      savingsTransactions,
      savingsExecutions,
      transfers,
      refunds,
      catalogs,
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
      database.savingsAccounts.toArray(),
      database.savingsTransactions.toArray(),
      database.savingsExecutions.toArray(),
      database.transfers.toArray(),
      database.refunds.toArray(),
      database.catalogs.toArray(),
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
        savingsAccounts,
        savingsTransactions,
        savingsExecutions,
        transfers,
        refunds,
        catalogs,
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
