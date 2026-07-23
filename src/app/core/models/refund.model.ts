export interface Refund {
  id?: number;
  expenseId: number;
  originalPaymentMethodId: number;
  refundPaymentMethodId: number;
  amount: number;
  date: string;
  description?: string;
  month: number;
  year: number;
}
