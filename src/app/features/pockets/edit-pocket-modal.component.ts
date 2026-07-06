import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';

import type { Pocket } from '../../core/models/pocket.model';
import { PocketService } from '../../core/services/pocket.service';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { NumberInputComponent } from '../../shared/components/number-input/number-input.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';

@Component({
  selector: 'app-edit-pocket-modal',
  imports: [ButtonDirective, NumberInputComponent, TextInputComponent],
  template: `
    <div class="modal-row">
      <app-text-input
        label="Nombre"
        [value]="name()"
        (valueChange)="name.set($event)"
      />
      <app-text-input
        label="Emoji"
        [value]="emoji()"
        (valueChange)="emoji.set($event)"
      />
    </div>

    <app-number-input
      label="Porcentaje"
      placeholder="0"
      [min]="0"
      [max]="100"
      [step]="0.5"
      [value]="percentage()"
      (valueChange)="percentage.set($event)"
    />

    @if (errorMessage(); as message) {
      <p class="modal-error" role="alert">{{ message }}</p>
    }

    <div class="modal-actions">
      <button appButton variant="secondary" type="button" (click)="onCancel()">
        Cancelar
      </button>
      <button
        appButton
        variant="primary"
        type="button"
        [disabled]="saving()"
        (click)="onSave()"
      >
        {{ saving() ? 'Guardando…' : 'Guardar cambios' }}
      </button>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }
      .modal-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-3);
      }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-2);
        margin-top: var(--space-2);
      }
      .modal-error {
        font-size: var(--text-size-extra-small);
        color: var(--color-danger);
        margin: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditPocketModalComponent {
  private readonly service = inject(PocketService);

  readonly pocket = input.required<Pocket>();
  readonly cancel = output<void>();
  readonly saved = output<Pocket>();

  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly name = signal('');
  protected readonly emoji = signal('');
  protected readonly percentage = signal(0);

  ngOnInit(): void {
    const initial = this.pocket();
    this.name.set(initial.name);
    this.emoji.set(initial.emoji);
    this.percentage.set(initial.percentage);
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  protected async onSave(): Promise<void> {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);

    const updated: Pocket = {
      ...this.pocket(),
      name: this.name().trim(),
      emoji: this.emoji() || '💼',
      percentage: this.round(this.percentage()),
    };

    try {
      await this.service.update(updated);
      this.saved.emit(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el bolsillo.';
      this.errorMessage.set(message);
    } finally {
      this.saving.set(false);
    }
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
