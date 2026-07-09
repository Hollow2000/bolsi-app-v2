export interface Expense {
  id?: number;
  date: string;
  description: string;
  amount: number;
  paymentMethodId: number;
  pocketId: number;
  category: string;
  month: number;
  year: number;
  isInstallment: boolean;
  installmentMonths?: number;
  monthlyInstallmentAmount?: number;
  hidden?: boolean;
}
