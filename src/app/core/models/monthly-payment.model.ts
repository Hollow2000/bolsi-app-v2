export type PaymentFrequency = 'monthly' | 'biweekly' | 'weekly';

export interface MonthlyPayment {
  id?: number;
  name: string;
  amount: number;
  paid: boolean;
  amountPaid: number;
  dueDate: string;
  statementDate?: string;
  paymentMethodId?: number;
  expenseCategory?: string;
  pocketId?: number;
  priority: number;
  isRecurring: boolean;
  frequency?: PaymentFrequency;
  month: number;
  year: number;
  icon?: string;
}
