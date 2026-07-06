import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly messageSignal = signal<string | null>(null);
  readonly message = this.messageSignal.asReadonly();

  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  show(message: string, durationMs: number = 2400): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }
    this.messageSignal.set(message);
    this.timeoutId = setTimeout(() => {
      this.messageSignal.set(null);
      this.timeoutId = null;
    }, durationMs);
  }

  clear(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.messageSignal.set(null);
  }
}
