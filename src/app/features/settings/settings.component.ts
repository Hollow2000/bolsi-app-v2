import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DataPortabilityService } from '../../core/services/data-portability.service';
import { MonthlyPaymentService } from '../../core/services/monthly-payment.service';
import { ScheduledSavingService } from '../../core/services/scheduled-saving.service';
import { SettingsService } from '../../core/services/settings.service';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { CardComponent } from '../../shared/components/card/card.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';
import { ToastService } from '../../shared/services/toast.service';
import { InstallPromptComponent } from '../../shared/components/install-prompt/install-prompt.component';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';

@Component({
  selector: 'app-settings',
  imports: [
    BottomSheetComponent,
    ButtonDirective,
    CardComponent,
    ConfirmDialogComponent,
    RouterLink,
    TextInputComponent,
    InstallPromptComponent,
  ],
  templateUrl: 'settings.component.html',
  styleUrl: 'settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  private readonly settingsService = inject(SettingsService);
  private readonly monthlyPaymentService = inject(MonthlyPaymentService);
  private readonly scheduledSavingService = inject(ScheduledSavingService);
  private readonly dataPortability = inject(DataPortabilityService);
  private readonly toast = inject(ToastService);

  protected readonly userName = signal('');
  protected readonly confirmOpen = signal(false);
  protected readonly confirmMessage = signal('');
  protected readonly confirmTone = signal<'primary' | 'destructive'>('destructive');
  protected readonly confirmAction = signal<(() => void) | null>(null);

  constructor() {
    void this.loadUserName();
  }

  protected async saveUserName(): Promise<void> {
    const name = this.userName().trim();
    if (!name) return;
    try {
      const record = await this.settingsService.get();
      await this.settingsService.save({
        userName: name,
        setupComplete: record?.setupComplete ?? true,
        customExpenseCategories: record?.customExpenseCategories,
      });
      this.toast.show('Nombre actualizado.');
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'No se pudo guardar.');
    }
  }

  protected closeMonth(): void {
    this.confirmMessage.set('¿Cerrar el mes actual? Los pagos recurrentes se replicarán al siguiente.');
    this.confirmTone.set('destructive');
    this.confirmAction.set(() => {
      void (async () => {
        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        try {
          const paymentCount = await this.monthlyPaymentService.replicateRecurring(month, year, nextMonth, nextYear);
          const savingCount = await this.scheduledSavingService.replicateToNextMonth(month, year, nextMonth, nextYear);
          this.toast.show(`${paymentCount} pago(s) y ${savingCount} ahorro(s) replicado(s) al siguiente mes.`);
        } catch (error) {
          this.toast.show(error instanceof Error ? error.message : 'No se pudo cerrar el mes.');
        }
      })();
    });
    this.confirmOpen.set(true);
  }

  protected async exportData(): Promise<void> {
    try {
      await this.dataPortability.exportToFile();
      this.toast.show('Respaldo descargado.');
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'No se pudo exportar.');
    }
  }

  protected async onImportFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.confirmMessage.set('¿Importar este archivo? Reemplazará todos los datos actuales.');
    this.confirmTone.set('primary');
    this.confirmAction.set(() => {
      void (async () => {
        try {
          await this.dataPortability.importFromFile(file);
          this.toast.show('Datos importados. Recargando…');
          setTimeout(() => window.location.reload(), 800);
        } catch (error) {
          this.toast.show(error instanceof Error ? error.message : 'No se pudo importar.');
        } finally {
          input.value = '';
        }
      })();
    });
    this.confirmOpen.set(true);
  }

  protected onConfirm(): void {
    this.confirmAction()?.();
    this.confirmOpen.set(false);
    this.confirmAction.set(null);
  }

  protected onCancelConfirm(): void {
    this.confirmOpen.set(false);
    this.confirmAction.set(null);
  }

  private async loadUserName(): Promise<void> {
    const record = await this.settingsService.get();
    this.userName.set(record?.userName ?? '');
  }
}
