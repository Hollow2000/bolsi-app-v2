import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { InstallPromptService } from '../../services/install-prompt.service';

@Component({
  selector: 'app-install-prompt',
  template: `
    @if (installPrompt.canInstall() && !installPrompt.isInstalled()) {
      <button class="install-button" type="button" (click)="installPrompt.prompt()" aria-label="Instalar aplicación">
        <span class="material-symbols-outlined icon" aria-hidden="true">install</span>
        <span class="install-button__label">Instalar app</span>
      </button>
    }
  `,
  styles: `
    :host { display: contents; }
    .install-button {
      position: fixed;
      bottom: calc(var(--navigation-height) + var(--space-4));
      right: var(--space-4);
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-full);
      box-shadow: var(--shadow-medium);
      cursor: pointer;
      font-size: var(--text-size-small);
      font-weight: 600;
      z-index: 100;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .install-button:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-large);
    }
    .install-button:active {
      transform: translateY(0);
    }
    .install-button__label {
      font-family: var(--font-family);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallPromptComponent {
  protected readonly installPrompt = inject(InstallPromptService);
}
