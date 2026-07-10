import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { InstallPromptService } from '../../services/install-prompt.service';

@Component({
  selector: 'app-install-prompt',
  template: `
    @if (installPrompt.canInstall() && !installPrompt.isInstalled()) {
      <div class="install-banner" role="status">
        <span class="material-symbols-outlined install-banner__icon" aria-hidden="true">download</span>
        <span class="install-banner__text">Instala Bolsi en tu dispositivo</span>
        <button class="install-banner__action" type="button" (click)="installPrompt.prompt()" aria-label="Instalar aplicación">
          Instalar
        </button>
      </div>
    }
  `,
  styles: `
    :host { display: block; }
    .install-banner {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-4);
      background: var(--color-primary-subtle);
      border-bottom: 1px solid var(--color-primary-muted);
      font-size: var(--text-size-small);
      color: var(--text-primary);
      position: sticky;
      top: 0;
      z-index: 5;
    }
    .install-banner__icon {
      font-size: 18px;
      color: var(--color-primary);
      flex-shrink: 0;
    }
    .install-banner__text {
      flex: 1;
      font-weight: 500;
    }
    .install-banner__action {
      flex-shrink: 0;
      padding: var(--space-1) var(--space-3);
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-full);
      font-size: var(--text-size-extra-small);
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .install-banner__action:hover {
      background: var(--color-primary-hover);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallPromptComponent {
  protected readonly installPrompt = inject(InstallPromptService);
}
