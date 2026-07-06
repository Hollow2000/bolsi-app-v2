import { Pipe, type PipeTransform } from '@angular/core';

/**
 * Standalone helper — call from any component or service without
 * needing `inject()`. The `MexicanCurrencyPipe` delegates here so
 * there is a single source of truth for the format.
 */
export function formatMexicanCurrency(
  value: number | null | undefined,
  fractionDigits: number = 2,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

@Pipe({ name: 'mexicanCurrency' })
export class MexicanCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined, fractionDigits: number = 2): string {
    return formatMexicanCurrency(value, fractionDigits);
  }
}
