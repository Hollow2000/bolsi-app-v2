export type SavingFrequency = 'monthly' | 'biweekly' | 'weekly';

export interface ScheduledSaving {
  id?: number;
  name: string;
  amount: number;
  frequency: SavingFrequency;
  savingsAccountId: number;
  paymentMethodId: number;
  dayOfMonth?: number;
  isActive: boolean;
  icon?: string;
  createdAt: Date;
}
