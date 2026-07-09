import Dexie, { type EntityTable } from 'dexie';

import type { AppSettings } from '../models/app-settings.model';
import type { Budget } from '../models/budget.model';
import type { Expense } from '../models/expense.model';
import type { ExpenseTemplate } from '../models/expense-template.model';
import type { Income } from '../models/income.model';
import type { InstallmentPlan } from '../models/installment-plan.model';
import type { MonthlyPayment } from '../models/monthly-payment.model';
import type { PaymentMethod } from '../models/payment-method.model';
import type { Pocket } from '../models/pocket.model';
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
  }
}

export const database = new BolsiDatabase();
