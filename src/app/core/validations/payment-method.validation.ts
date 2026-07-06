import type { PaymentMethod } from '../models/payment-method.model';

/**
 * Pure validation for `PaymentMethod`. Throws an `Error` with a Spanish
 * user-facing message when the entity is malformed. The rules enforce
 * the data shape required for each payment method type so downstream
 * balance and statement logic can rely on consistent fields.
 */
export function validatePaymentMethod(paymentMethod: PaymentMethod): void {
  if (!paymentMethod.name || !paymentMethod.name.trim()) {
    throw new Error('El nombre del método de pago es obligatorio.');
  }

  if (paymentMethod.type === 'credit') {
    const creditLimit = paymentMethod.creditLimit;
    const statementClosingDay = paymentMethod.statementClosingDay;
    const creditDays = paymentMethod.creditDays;

    if (creditLimit === undefined || !Number.isFinite(creditLimit) || creditLimit <= 0) {
      throw new Error('El límite de crédito debe ser mayor a 0.');
    }
    if (
      statementClosingDay === undefined ||
      !Number.isInteger(statementClosingDay) ||
      statementClosingDay < 1 ||
      statementClosingDay > 31
    ) {
      throw new Error('El día de corte debe estar entre 1 y 31.');
    }
    if (creditDays === undefined || !Number.isInteger(creditDays) || creditDays < 1) {
      throw new Error('Los días de crédito deben ser al menos 1.');
    }
    return;
  }

  const currentBalance = paymentMethod.currentBalance;
  if (currentBalance === undefined || !Number.isFinite(currentBalance)) {
    throw new Error('El saldo actual es obligatorio para efectivo y débito.');
  }
}
