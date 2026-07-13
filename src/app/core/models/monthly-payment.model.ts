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
  month: number;
  year: number;
  icon?: string;
}
