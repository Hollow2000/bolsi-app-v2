export interface MonthlyBalance {
  totalAvailable: number;
  billableDebtThisMonth: number;
  pendingFixedPayments: number;
  pendingScheduledSavings: number;
  pendingIncome: number;
  netBalanceThisMonth: number;
  endOfMonthProjection: number;
}
