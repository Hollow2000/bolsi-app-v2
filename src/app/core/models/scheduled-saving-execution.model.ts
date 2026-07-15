export interface ScheduledSavingExecution {
  id?: number;
  scheduledSavingId: number;
  month: number;
  year: number;
  occurrenceIndex: number;
  executed: boolean;
  executedDate?: string;
  amount: number;
}
