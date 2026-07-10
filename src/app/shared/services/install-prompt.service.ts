import { Injectable, signal } from '@angular/core';

/**
 * Captures the `beforeinstallprompt` event and provides methods
 * to trigger the PWA install prompt. Also tracks whether the app
 * is running as an installed PWA.
 */
@Injectable({ providedIn: 'root' })
export class InstallPromptService {
  private deferredPrompt: Event | null = null;

  readonly canInstall = signal(false);
  readonly isInstalled = signal(false);

  constructor() {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      this.isInstalled.set(isStandalone);

      window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        this.deferredPrompt = event;
        // Defer signal update so Angular can render the component first
        setTimeout(() => this.canInstall.set(!this.isInstalled()), 0);
      });

      window.addEventListener('appinstalled', () => {
        this.deferredPrompt = null;
        this.canInstall.set(false);
        this.isInstalled.set(true);
      });
    }
  }

  async prompt(): Promise<void> {
    if (!this.deferredPrompt) return;
    const event = this.deferredPrompt as unknown as { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
    await event.prompt();
    const result = await event.userChoice;
    if (result.outcome === 'accepted') {
      this.canInstall.set(false);
    }
    this.deferredPrompt = null;
  }
}
