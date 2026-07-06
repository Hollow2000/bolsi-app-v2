export interface InstallmentPlan {
  id?: number;
  expenseOriginId: number;
  paymentMethodId: number;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  cutoffMonth: number;
  cutoffYear: number;
  paid: boolean;
}
