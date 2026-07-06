import { Pipe, type PipeTransform } from '@angular/core';

/**
 * Parses a `YYYY-MM-DD` string into a local-time Date object so day
 * arithmetic respects the user's timezone (UTC-6 for Mexico). Always
 * passes `T00:00:00` to the Date constructor; never passes a bare
 * date string.
 */
@Pipe({ name: 'localDate' })
export class LocalDatePipe implements PipeTransform {
  transform(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }
    return new Date(`${value}T00:00:00`);
  }
}
