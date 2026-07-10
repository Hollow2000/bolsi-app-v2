import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import type { ExpenseTemplate } from '../../core/models/expense-template.model';
import type { PaymentMethod } from '../../core/models/payment-method.model';
import type { Pocket } from '../../core/models/pocket.model';
import { ExpenseTemplateService } from '../../core/services/expense-template.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { PocketService } from '../../core/services/pocket.service';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { CardComponent } from '../../shared/components/card/card.component';
import { FabComponent } from '../../shared/components/fab/fab.component';
import { IconButtonDirective } from '../../shared/components/icon-button/icon-button.directive';
import { ListItemComponent } from '../../shared/components/list-item/list-item.component';
import { ToastService } from '../../shared/services/toast.service';
import { MexicanCurrencyPipe } from '../../shared/pipes/mexican-currency.pipe';
import { TemplateFormModalComponent } from './template-form-modal.component';
import { InstallPromptComponent } from '../../shared/components/install-prompt/install-prompt.component';

@Component({
  selector: 'app-templates-list',
  imports: [
    BottomSheetComponent,
    CardComponent,
    FabComponent,
    IconButtonDirective,
    ListItemComponent,
    MexicanCurrencyPipe,
    TemplateFormModalComponent,
    InstallPromptComponent,
  ],
  templateUrl: './templates-list.component.html',
  styleUrl: './templates-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplatesListComponent {
  private readonly templateService = inject(ExpenseTemplateService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly pocketService = inject(PocketService);
  private readonly toast = inject(ToastService);

  protected readonly templates = signal<ExpenseTemplate[]>([]);
  protected readonly paymentMethods = signal<PaymentMethod[]>([]);
  protected readonly pockets = signal<Pocket[]>([]);
  protected readonly modalOpen = signal(false);
  protected readonly editingTemplate = signal<ExpenseTemplate | null>(null);

  constructor() {
    void this.load();
  }

  protected methodName(id: number): string {
    return this.paymentMethods().find((m) => m.id === id)?.name ?? 'Sin método';
  }

  protected pocketName(id: number): string {
    const pocket = this.pockets().find((p) => p.id === id);
    return pocket ? pocket.name : 'Sin bolsillo';
  }

  protected openAdd(): void {
    this.editingTemplate.set(null);
    this.modalOpen.set(true);
  }

  protected openEdit(template: ExpenseTemplate): void {
    this.editingTemplate.set(template);
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.modalOpen.set(false);
    this.editingTemplate.set(null);
  }

  protected async onSaved(template: ExpenseTemplate): Promise<void> {
    try {
      const editing = this.editingTemplate();
      if (editing?.id !== undefined) {
        await this.templateService.update({ ...template, id: editing.id });
        this.toast.show('Plantilla actualizada.');
      } else {
        await this.templateService.create(template);
        this.toast.show('Plantilla creada.');
      }
      this.closeModal();
      await this.load();
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'No se pudo guardar la plantilla.');
    }
  }

  protected async useTemplate(template: ExpenseTemplate): Promise<void> {
    try {
      if (template.id === undefined) return;
      await this.templateService.registerFromTemplate(template.id);
      this.toast.show(`Gasto "${template.description}" registrado.`);
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'No se pudo registrar el gasto.');
    }
  }

  protected async deleteTemplate(template: ExpenseTemplate): Promise<void> {
    if (template.id === undefined) return;
    try {
      await this.templateService.delete(template.id);
      this.toast.show('Plantilla eliminada.');
      await this.load();
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'No se pudo eliminar la plantilla.');
    }
  }

  private async load(): Promise<void> {
    const [templates, methods, pockets] = await Promise.all([
      this.templateService.getAll(),
      this.paymentMethodService.getAll(),
      this.pocketService.getAll(),
    ]);
    this.templates.set(templates);
    this.paymentMethods.set(methods);
    this.pockets.set(pockets);
  }
}
