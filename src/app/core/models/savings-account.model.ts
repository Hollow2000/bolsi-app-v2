export type SavingFrequency = 'monthly' | 'biweekly' | 'weekly';

export interface ScheduledSavingConfig {
  paymentMethodId: number;
  amount: number;
  frequency: SavingFrequency;
  dayOfMonth?: number;
  isActive: boolean;
}

export interface SavingsAccount {
  id?: number;
  name: string;
  icon: string;
  balance: number;
  goal?: number;
  scheduledSaving?: ScheduledSavingConfig;
  createdAt: Date;
}
