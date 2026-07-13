export interface SavingsTransaction {
  id?: number;
  savingsId: number;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'yield';
  date: Date;
  description?: string;
}
