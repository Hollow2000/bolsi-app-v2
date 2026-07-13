import type { SavingsAccount } from '../models/savings-account.model';
import type { SavingsTransaction } from '../models/savings-transaction.model';

/**
 * Pure validation for `SavingsAccount`. Throws an `Error` with a Spanish
 * user-facing message when the entity is malformed.
 */
export function validateSavingsAccount(account: Omit<SavingsAccount, 'id' | 'createdAt'>): void {
  if (!account.name || !account.name.trim()) {
    throw new Error('El nombre de la cuenta es obligatorio.');
  }

  if (!account.icon || !account.icon.trim()) {
    throw new Error('El icono es obligatorio.');
  }

  if (!Number.isFinite(account.balance) || account.balance < 0) {
    throw new Error('El saldo no puede ser negativo.');
  }

  if (account.goal !== undefined && (!Number.isFinite(account.goal) || account.goal <= 0)) {
    throw new Error('La meta debe ser mayor a 0.');
  }
}

/**
 * Pure validation for `SavingsTransaction`. Throws an `Error` with a Spanish
 * user-facing message when the transaction is malformed.
 */
export function validateSavingsTransaction(
  transaction: Omit<SavingsTransaction, 'id' | 'date'>,
  account: SavingsAccount,
): void {
  if (!Number.isFinite(transaction.amount) || transaction.amount <= 0) {
    throw new Error('El monto debe ser mayor a 0.');
  }

  if (transaction.type === 'withdrawal' && transaction.amount > account.balance) {
    throw new Error('El monto excede el saldo disponible.');
  }
}

/**
 * Throws if the user tries to withdraw more than available.
 */
export function assertCanWithdraw(amount: number, account: SavingsAccount): void {
  if (amount > account.balance) {
    throw new Error('El monto excede el saldo disponible.');
  }
}
