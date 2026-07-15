export interface SavingsExecution {
  id?: number;
  savingsAccountId: number;
  month: number;
  year: number;
  occurrenceIndex: number;
  executedDate: string;
  amount: number;
}
