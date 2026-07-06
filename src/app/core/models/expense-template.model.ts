export interface ExpenseTemplate {
  id?: number;
  description: string;
  amount: number;
  paymentMethodId: number;
  pocketId: number;
  category: string;
  icon: string;
  sortOrder: number;
}
