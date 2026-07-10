import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { InstallPromptService } from '../../services/install-prompt.service';

@Component({
  selector: 'app-install-prompt',
  template: `
    @if (installPrompt.canInstall() && !installPrompt.isInstalled()) {
      <button class="install-chip" type="button" (click)="installPrompt.prompt()" aria-label="Instalar aplicación">
        <span class="material-symbols-outlined install-chip__icon" aria-hidden="true">download</span>
        <span class="install-chip__label">Instalar</span>
      </button>
    }
  `,
  styles: `
    :host { display: contents; }
    .install-chip {
      position: fixed;
      top: var(--space-3);
      right: var(--space-3);
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-1) var(--space-3);
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-full);
      box-shadow: var(--shadow-medium);
      cursor: pointer;
      font-size: var(--text-size-extra-small);
      font-weight: 600;
      z-index: 100;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .install-chip:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-large);
    }
    .install-chip:active {
      transform: translateY(0);
    }
    .install-chip__icon {
      font-size: 16px;
    }
    .install-chip__label {
      font-family: var(--font-family);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallPromptComponent {
  protected readonly installPrompt = inject(InstallPromptService);
}
