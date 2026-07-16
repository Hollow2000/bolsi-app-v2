export interface Expense {
  id?: number;
  date: string;
  applicationDate?: string;
  description: string;
  amount: number;
  paymentMethodId: number;
  pocketId: number;
  category: string;
  icon?: string;
  month: number;
  year: number;
  isInstallment: boolean;
  installmentMonths?: number;
  monthlyInstallmentAmount?: number;
  hidden?: boolean;
}
