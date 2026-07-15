import Dexie, { type EntityTable } from 'dexie';

import type { AppSettings } from '../models/app-settings.model';
import type { Budget } from '../models/budget.model';
import type { CatalogItem } from '../models/catalog.model';
import type { Expense } from '../models/expense.model';
import type { ExpenseTemplate } from '../models/expense-template.model';
import type { Income } from '../models/income.model';
import type { InstallmentPlan } from '../models/installment-plan.model';
import type { MonthlyPayment } from '../models/monthly-payment.model';
import type { PaymentMethod } from '../models/payment-method.model';
import type { Pocket } from '../models/pocket.model';
import type { SavingsAccount } from '../models/savings-account.model';
import type { SavingsExecution } from '../models/savings-execution.model';
import type { SavingsTransaction } from '../models/savings-transaction.model';
import type { Transfer } from '../models/transfer.model';

export class BolsiDatabase extends Dexie {
  paymentMethods!: EntityTable<PaymentMethod, 'id'>;
  expenses!: EntityTable<Expense, 'id'>;
  installmentPlans!: EntityTable<InstallmentPlan, 'id'>;
  incomes!: EntityTable<Income, 'id'>;
  pockets!: EntityTable<Pocket, 'id'>;
  monthlyPayments!: EntityTable<MonthlyPayment, 'id'>;
  budgets!: EntityTable<Budget, 'id'>;
  expenseTemplates!: EntityTable<ExpenseTemplate, 'id'>;
  transfers!: EntityTable<Transfer, 'id'>;
  appSettings!: EntityTable<AppSettings, 'id'>;
  savingsAccounts!: EntityTable<SavingsAccount, 'id'>;
  savingsTransactions!: EntityTable<SavingsTransaction, 'id'>;
  catalogs!: EntityTable<CatalogItem, 'id'>;
  savingsExecutions!: EntityTable<SavingsExecution, 'id'>;

  constructor() {
    super('BolsiDB');
    this.version(1).stores({
      paymentMethods: '++id, type',
      expenses: '++id, month, year, paymentMethodId, pocketId, isInstallment',
      installmentPlans: '++id, expenseOriginId, paymentMethodId, cutoffMonth, cutoffYear, paid',
      incomes: '++id, month, year, paymentMethodId, status',
      pockets: '++id',
      monthlyPayments: '++id, month, year, paid, isRecurring',
      budgets: '++id, month, year, category',
      appSettings: '++id',
    });
    this.version(2).stores({
      paymentMethods: '++id, type',
      expenses: '++id, month, year, paymentMethodId, pocketId, isInstallment',
      installmentPlans: '++id, expenseOriginId, paymentMethodId, cutoffMonth, cutoffYear, paid',
      incomes: '++id, month, year, paymentMethodId, status',
      pockets: '++id',
      monthlyPayments: '++id, month, year, paid, isRecurring',
      budgets: '++id, month, year, category',
      expenseTemplates: '++id, description',
      appSettings: '++id',
    });
    this.version(3).stores({
      paymentMethods: '++id, type',
      expenses: '++id, month, year, paymentMethodId, pocketId, isInstallment',
      installmentPlans: '++id, expenseOriginId, paymentMethodId, cutoffMonth, cutoffYear, paid',
      incomes: '++id, month, year, paymentMethodId, status',
      pockets: '++id, sortOrder',
      monthlyPayments: '++id, month, year, paid, isRecurring',
      budgets: '++id, month, year, category',
      expenseTemplates: '++id, description',
      appSettings: '++id',
    });
    this.version(4).stores({
      paymentMethods: '++id, type',
      expenses: '++id, month, year, paymentMethodId, pocketId, isInstallment',
      installmentPlans: '++id, expenseOriginId, paymentMethodId, cutoffMonth, cutoffYear, paid',
      incomes: '++id, month, year, paymentMethodId, status',
      pockets: '++id, sortOrder',
      monthlyPayments: '++id, month, year, paid, isRecurring',
      budgets: '++id, month, year, category',
      expenseTemplates: '++id, description',
      transfers: '++id, fromPaymentMethodId, toPaymentMethodId, month, year',
      appSettings: '++id',
    });
    this.version(5).stores({
      paymentMethods: '++id, type',
      expenses: '++id, month, year, paymentMethodId, pocketId, isInstallment, hidden',
      installmentPlans: '++id, expenseOriginId, paymentMethodId, cutoffMonth, cutoffYear, paid',
      incomes: '++id, month, year, paymentMethodId, status',
      pockets: '++id, sortOrder',
      monthlyPayments: '++id, month, year, paid, isRecurring',
      budgets: '++id, month, year, category',
      expenseTemplates: '++id, description',
      transfers: '++id, fromPaymentMethodId, toPaymentMethodId, month, year, isCreditCardPayment, billingPeriodMonth, billingPeriodYear',
      appSettings: '++id',
    });
    this.version(6).stores({
      paymentMethods: '++id, type',
      expenses: '++id, month, year, paymentMethodId, pocketId, isInstallment, hidden',
      installmentPlans: '++id, expenseOriginId, paymentMethodId, cutoffMonth, cutoffYear, paid',
      incomes: '++id, month, year, paymentMethodId, status',
      pockets: '++id, sortOrder',
      monthlyPayments: '++id, month, year, paid, isRecurring',
      budgets: '++id, month, year, category',
      expenseTemplates: '++id, description',
      transfers: '++id, fromPaymentMethodId, toPaymentMethodId, month, year, isCreditCardPayment, billingPeriodMonth, billingPeriodYear',
      appSettings: '++id',
    }).upgrade(async (tx) => {
      await tx.table('pockets').toCollection().modify((pocket: Record<string, unknown>) => {
        if ('emoji' in pocket && !('icon' in pocket)) {
          pocket['icon'] = pocket['emoji'];
          delete pocket['emoji'];
        }
      });
    });
    this.version(7).stores({
      paymentMethods: '++id, type',
      expenses: '++id, month, year, paymentMethodId, pocketId, isInstallment, hidden',
      installmentPlans: '++id, expenseOriginId, paymentMethodId, cutoffMonth, cutoffYear, paid',
      incomes: '++id, month, year, paymentMethodId, status',
      pockets: '++id, sortOrder',
      monthlyPayments: '++id, month, year, paid, isRecurring',
      budgets: '++id, month, year, category',
      expenseTemplates: '++id, description',
      transfers: '++id, fromPaymentMethodId, toPaymentMethodId, month, year, isCreditCardPayment, billingPeriodMonth, billingPeriodYear',
      appSettings: '++id',
      savingsAccounts: '++id',
      savingsTransactions: '++id, savingsId, date',
    }).upgrade(async (tx) => {
      const paymentMethods = tx.table('paymentMethods');
      const savingsAccounts = tx.table('savingsAccounts');
      const savingsTransactions = tx.table('savingsTransactions');

      await paymentMethods.toCollection().modify(async (method: Record<string, unknown>) => {
        if (method['type'] === 'savings') {
          const account = {
            name: method['name'] as string,
            icon: 'savings',
            balance: (method['currentBalance'] as number) ?? 0,
            createdAt: new Date(),
          };
          await savingsAccounts.add(account);
          await paymentMethods.delete(method['id']);
        }
      });
    });
    this.version(8).stores({
      paymentMethods: '++id, type',
      expenses: '++id, month, year, paymentMethodId, pocketId, isInstallment, hidden, category',
      installmentPlans: '++id, expenseOriginId, paymentMethodId, cutoffMonth, cutoffYear, paid',
      incomes: '++id, month, year, paymentMethodId, status, category',
      pockets: '++id, sortOrder',
      monthlyPayments: '++id, month, year, paid, isRecurring',
      budgets: '++id, month, year, category',
      expenseTemplates: '++id, description',
      transfers: '++id, fromPaymentMethodId, toPaymentMethodId, month, year, isCreditCardPayment, billingPeriodMonth, billingPeriodYear',
      appSettings: '++id',
      savingsAccounts: '++id',
      savingsTransactions: '++id, savingsId, date',
      catalogs: '++id, type, [type+isDefault]',
    }).upgrade(async (tx) => {
      const catalogs = tx.table('catalogs');
      const appSettings = tx.table('appSettings');

      const defaultExpenseCategories = [
        { name: 'Vivienda', icon: 'home' },
        { name: 'Servicios', icon: 'bolt' },
        { name: 'Supermercado', icon: 'local_grocery_store' },
        { name: 'Transporte', icon: 'directions_car' },
        { name: 'Ropa', icon: 'apparel' },
        { name: 'Seguros', icon: 'security' },
        { name: 'Salud', icon: 'local_hospital' },
        { name: 'Compras menores', icon: 'shopping_bag' },
        { name: 'Comidas fuera', icon: 'restaurant' },
        { name: 'Entretenimiento', icon: 'movie' },
        { name: 'Belleza', icon: 'spa' },
        { name: 'Recargas', icon: 'phone' },
        { name: 'Regalos', icon: 'celebration' },
        { name: 'Viajes', icon: 'flight' },
        { name: 'Tecnología', icon: 'devices' },
        { name: 'Otro', icon: 'category' },
      ];

      const defaultIncomeCategories = [
        { name: 'Salario', icon: 'work' },
        { name: 'Devoluciones', icon: 'assignment_return' },
        { name: 'Regalo', icon: 'card_giftcard' },
        { name: 'Reembolso', icon: 'receipt' },
        { name: 'Otro', icon: 'category' },
      ];

      let sortOrder = 0;
      for (const cat of defaultExpenseCategories) {
        await catalogs.add({
          type: 'expense',
          name: cat.name,
          icon: cat.icon,
          isDefault: true,
          sortOrder: sortOrder++,
        });
      }

      sortOrder = 0;
      for (const cat of defaultIncomeCategories) {
        await catalogs.add({
          type: 'income',
          name: cat.name,
          icon: cat.icon,
          isDefault: true,
          sortOrder: sortOrder++,
        });
      }

      const settings = await appSettings.toCollection().first();
      if (settings) {
        const customExpense = (settings as Record<string, unknown>)['customExpenseCategories'] as string[] | undefined;
        if (customExpense) {
          for (const name of customExpense) {
            await catalogs.add({
              type: 'expense',
              name,
              icon: 'category',
              isDefault: false,
              sortOrder: sortOrder++,
            });
          }
        }

        const customIncome = (settings as Record<string, unknown>)['customIncomeCategories'] as string[] | undefined;
        sortOrder = 0;
        if (customIncome) {
          for (const name of customIncome) {
            await catalogs.add({
              type: 'income',
              name,
              icon: 'category',
              isDefault: false,
              sortOrder: sortOrder++,
            });
          }
        }
      }
    });
    this.version(9).stores({
      paymentMethods: '++id, type',
      expenses: '++id, month, year, paymentMethodId, pocketId, isInstallment, hidden, category',
      installmentPlans: '++id, expenseOriginId, paymentMethodId, cutoffMonth, cutoffYear, paid',
      incomes: '++id, month, year, paymentMethodId, status, category',
      pockets: '++id, sortOrder',
      monthlyPayments: '++id, month, year, paid, isRecurring',
      budgets: '++id, month, year, category',
      expenseTemplates: '++id, description',
      transfers: '++id, fromPaymentMethodId, toPaymentMethodId, month, year, isCreditCardPayment, billingPeriodMonth, billingPeriodYear',
      appSettings: '++id',
      savingsAccounts: '++id',
      savingsTransactions: '++id, savingsId, date',
      catalogs: '++id, type, [type+isDefault]',
      scheduledSavings: '++id, savingsAccountId, paymentMethodId, isActive',
      scheduledSavingExecutions: '++id, scheduledSavingId, [month+year], executed',
    });
    this.version(10).stores({
      paymentMethods: '++id, type',
      expenses: '++id, month, year, paymentMethodId, pocketId, isInstallment, hidden, category',
      installmentPlans: '++id, expenseOriginId, paymentMethodId, cutoffMonth, cutoffYear, paid',
      incomes: '++id, month, year, paymentMethodId, status, category',
      pockets: '++id, sortOrder',
      monthlyPayments: '++id, month, year, paid, isRecurring',
      budgets: '++id, month, year, category',
      expenseTemplates: '++id, description',
      transfers: '++id, fromPaymentMethodId, toPaymentMethodId, month, year, isCreditCardPayment, billingPeriodMonth, billingPeriodYear',
      appSettings: '++id',
      savingsAccounts: '++id',
      savingsTransactions: '++id, savingsId, date',
      catalogs: '++id, type, [type+isDefault]',
      scheduledSavings: null,
      scheduledSavingExecutions: null,
      savingsExecutions: '++id, savingsAccountId, [month+year+occurrenceIndex]',
    });
  }
}

export const database = new BolsiDatabase();
