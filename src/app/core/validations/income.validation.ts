import type { Income } from '../models/income.model';
import type { PaymentMethod } from '../models/payment-method.model';

/**
 * Pure validation functions for `Income`. Every check is a synchronous
 * guard that throws an `Error` with a Spanish user-facing message when
 * the rule is broken. No side effects, no I/O — safe to call from any
 * service, component, or unit test.
 */

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  return (
    parsed.getFullYear() === Number(value.slice(0, 4)) &&
    parsed.getMonth() === Number(value.slice(5, 7)) - 1 &&
    parsed.getDate() === Number(value.slice(8, 10))
  );
}

export function validateIncomeFields(income: Income): void {
  if (!Number.isFinite(income.amount) || income.amount <= 0) {
    throw new Error('El monto del ingreso debe ser mayor a 0.');
  }
  if (!isValidIsoDate(income.date)) {
    throw new Error('La fecha del ingreso debe tener el formato YYYY-MM-DD y ser una fecha real.');
  }
  if (!Number.isInteger(income.month) || income.month < 1 || income.month > 12) {
    throw new Error('El mes del ingreso debe estar entre 1 y 12.');
  }
  if (!Number.isInteger(income.year) || income.year < 1900 || income.year > 9999) {
    throw new Error('El año del ingreso no es válido.');
  }
  if (!income.description.trim()) {
    throw new Error('La descripción del ingreso es obligatoria.');
  }
}

/**
 * Business rule: an income can only be assigned to a payment method
 * that is not a credit card. Credit cards are for spending — receiving
 * money on them would incorrectly increase `availableCredit`.
 *
 * The caller passes the result of `PaymentMethodService.getById` (which
 * may be `undefined` if the method was deleted). This function throws
 * a descriptive error for both "not found" and "wrong type" cases.
 */
export function assertCanReceiveIncome(
  paymentMethod: PaymentMethod | undefined,
): void {
  if (!paymentMethod) {
    throw new Error('El método de pago seleccionado no existe.');
  }
  if (paymentMethod.type === 'credit') {
    throw new Error(
      'Los ingresos no pueden asignarse a tarjetas de crédito. Solo efectivo o débito.',
    );
  }
}
