import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Minimal placeholder shown during PHASE 0. Replaced in PHASE 1 by the
 * real onboarding wizard.
 */
@Component({
  selector: 'app-onboarding-placeholder',
  template: `
    <main class="placeholder">
      <span class="material-symbols-outlined icon icon--large" aria-hidden="true">hourglass_empty</span>
      <h1>Bolsi App</h1>
      <p>Configuración inicial completada. El asistente de onboarding llega en la siguiente fase.</p>
    </main>
  `,
  styles: [
    `
      :host { display: block; min-height: 100dvh; background: var(--background-primary); }
      .placeholder {
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--space-3);
        padding: var(--space-6);
        text-align: center;
        color: var(--text-primary);
      }
      .icon { color: var(--color-primary); }
      h1 { font-size: var(--text-size-extra-large); font-weight: 700; margin: 0; }
      p  { color: var(--text-secondary); max-width: 32ch; }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPlaceholderComponent {}
