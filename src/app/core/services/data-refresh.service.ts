import { Injectable, signal } from '@angular/core';

/**
 * Shared signal that lets independent screens (e.g. the dashboard) know
 * that the underlying data changed after an operation performed elsewhere
 * (credit card cutoff, payment, etc.) so they can reload in real time
 * instead of waiting for a page reload.
 */
@Injectable({ providedIn: 'root' })
export class DataRefreshService {
  private readonly _version = signal(0);

  readonly version = this._version.asReadonly();

  notify(): void {
    this._version.update((v) => v + 1);
  }
}
