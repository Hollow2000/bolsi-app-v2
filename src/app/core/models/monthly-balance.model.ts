export interface MonthlyBalance {
  totalAvailable: number;
  billableDebtThisMonth: number;
  pendingFixedPayments: number;
  pendingIncome: number;
  netBalanceThisMonth: number;
  endOfMonthProjection: number;
}
