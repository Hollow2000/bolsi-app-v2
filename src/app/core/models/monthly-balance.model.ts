export interface MonthlyBalance {
  totalAvailable: number;
  billableDebtThisMonth: number;
  pendingCardDebtFromPreviousPeriods: number;
  pendingFixedPayments: number;
  pendingScheduledSavings: number;
  pendingIncome: number;
  netBalanceThisMonth: number;
  endOfMonthProjection: number;
}
