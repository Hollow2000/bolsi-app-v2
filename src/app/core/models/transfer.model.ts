export interface Transfer {
  id?: number;
  fromPaymentMethodId: number;
  toPaymentMethodId: number;
  amount: number;
  date: string;
  description: string;
  month: number;
  year: number;
  isCreditCardPayment?: boolean;
  billingPeriodMonth?: number;
  billingPeriodYear?: number;
}
