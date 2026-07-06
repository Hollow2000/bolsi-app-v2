export type IncomeFrequency = 'one-time' | 'monthly' | 'biweekly';
export type IncomeStatus = 'received' | 'expected';

export interface Income {
  id?: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  paymentMethodId: number;
  frequency: IncomeFrequency;
  status: IncomeStatus;
  month: number;
  year: number;
}
