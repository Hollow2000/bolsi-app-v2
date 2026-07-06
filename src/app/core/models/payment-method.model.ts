export type PaymentMethodType = 'cash' | 'debit' | 'credit';

export interface PaymentMethod {
  id?: number;
  name: string;
  type: PaymentMethodType;
  currentBalance?: number;
  creditLimit?: number;
  availableCredit?: number;
  statementClosingDay?: number;
  creditDays?: number;
}
