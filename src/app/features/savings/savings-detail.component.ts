import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import type { PaymentMethod } from '../../core/models/payment-method.model';
import type { SavingsAccount, SavingFrequency, ScheduledSavingConfig } from '../../core/models/savings-account.model';
import type { SavingsTransaction } from '../../core/models/savings-transaction.model';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { SavingsService } from '../../core/services/savings.service';
import { MATERIAL_ICONS } from '../../core/services/catalog.service';
import { SegmentedControlComponent, type SegmentedOption } from '../../shared/components/segmented-control/segmented-control.component';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { IconPickerComponent } from '../../shared/components/icon-picker/icon-picker.component';
import { MexicanCurrencyPipe, formatMexicanCurrency } from '../../shared/pipes/mexican-currency.pipe';
import { NumberInputComponent } from '../../shared/components/number-input/number-input.component';
import { SelectInputComponent } from '../../shared/components/select-input/select-input.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';
import { ToastService } from '../../shared/services/toast.service';
import { InstallPromptComponent } from '../../shared/components/install-prompt/install-prompt.component';

export type TransactionFilter = 'all' | 'deposit' | 'withdrawal' | 'yield';

interface TransactionDraft {
  amount: number;
  description: string;
  paymentMethodId: number;
}

@Component({
  selector: 'app-savings-detail',
  imports: [
    BottomSheetComponent,
    ButtonDirective,
    IconPickerComponent,
    MexicanCurrencyPipe,
    NumberInputComponent,
    RouterLink,
    SegmentedControlComponent,
    SelectInputComponent,
    TextInputComponent,
    InstallPromptComponent,
  ],
  templateUrl: './savings-detail.component.html',
  styleUrl: './savings-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SavingsDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(SavingsService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly toast = inject(ToastService);

  private readonly accountId = Number(this.route.snapshot.paramMap.get('id')) || 0;

  protected readonly account = signal<SavingsAccount | null>(null);
  protected readonly transactions = signal<SavingsTransaction[]>([]);
  protected readonly summary = signal({ totalDeposits: 0, totalWithdrawals: 0, totalYields: 0 });
  protected readonly filter = signal<TransactionFilter>('all');
  protected readonly icons = MATERIAL_ICONS;
  protected readonly paymentMethods = signal<PaymentMethod[]>([]);

  protected readonly showTransactionForm = signal(false);
  protected readonly transactionType = signal<'deposit' | 'withdrawal' | 'yield'>('deposit');
  protected readonly transactionDraft = signal<TransactionDraft>({ amount: 0, description: '', paymentMethodId: 0 });
  protected readonly transactionError = signal<string | null>(null);

  protected readonly showEditForm = signal(false);
  protected readonly editDraft = signal({ name: '', icon: 'savings', goal: 0 });
  protected readonly editDraftIcon = signal('savings');
  protected readonly editError = signal<string | null>(null);

  protected readonly showScheduledForm = signal(false);
  protected readonly scheduledDraft = signal({
    paymentMethodId: 0,
    amount: 0,
    frequency: 'monthly' as SavingFrequency,
    dayOfMonth: 1,
    isActive: true,
  });
  protected readonly scheduledError = signal<string | null>(null);
  protected readonly frequencyOptions: readonly SegmentedOption<SavingFrequency>[] = [
    { value: 'monthly', label: 'Mensual' },
    { value: 'biweekly', label: 'Quincenal' },
    { value: 'weekly', label: 'Semanal' },
  ];

  protected readonly filteredTransactions = computed(() => {
    const all = this.transactions();
    const f = this.filter();
    if (f === 'all') return all;
    return all.filter((t) => t.type === f);
  });

  protected readonly progressPercentage = computed(() => {
    const acc = this.account();
    if (!acc || !acc.goal || acc.goal <= 0) return 0;
    return Math.min(100, Math.round((acc.balance / acc.goal) * 100));
  });

  protected readonly availablePaymentMethods = computed(() =>
    this.paymentMethods().filter((m) => m.type === 'cash' || m.type === 'debit'),
  );

  constructor() {
    void this.load();
  }

  protected filterLabel(type: TransactionFilter): string {
    const labels: Record<TransactionFilter, string> = {
      all: 'Todas',
      deposit: 'Depósitos',
      withdrawal: 'Retiros',
      yield: 'Rendimientos',
    };
    return labels[type];
  }

  protected transactionIcon(type: SavingsTransaction['type']): string {
    const icons: Record<SavingsTransaction['type'], string> = {
      deposit: 'add_circle',
      withdrawal: 'remove_circle',
      yield: 'trending_up',
    };
    return icons[type];
  }

  protected transactionTypeLabel(type: SavingsTransaction['type']): string {
    const labels: Record<SavingsTransaction['type'], string> = {
      deposit: 'Depósito',
      withdrawal: 'Retiro',
      yield: 'Rendimiento',
    };
    return labels[type];
  }

  protected formatDate(date: Date | string): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  protected openTransactionForm(type: 'deposit' | 'withdrawal' | 'yield'): void {
    this.transactionType.set(type);
    this.transactionDraft.set({ amount: 0, description: '', paymentMethodId: 0 });
    this.transactionError.set(null);
    this.showTransactionForm.set(true);
  }

  protected closeTransactionForm(): void {
    this.showTransactionForm.set(false);
    this.transactionError.set(null);
  }

  protected onTransactionDraftChange<K extends keyof TransactionDraft>(field: K, value: TransactionDraft[K]): void {
    this.transactionDraft.update((d) => ({ ...d, [field]: value }));
  }

  protected onPaymentMethodChange(value: number | string | null): void {
    const id = typeof value === 'number' ? value : 0;
    this.transactionDraft.update((d) => ({ ...d, paymentMethodId: id }));
  }

  protected async saveTransaction(): Promise<void> {
    const draft = this.transactionDraft();
    const type = this.transactionType();
    const acc = this.account();
    if (!acc || acc.id === undefined) return;

    if (draft.amount <= 0) {
      this.transactionError.set('El monto debe ser mayor a 0.');
      return;
    }

    if ((type === 'deposit' || type === 'withdrawal') && draft.paymentMethodId === 0) {
      this.transactionError.set('Selecciona una cuenta.');
      return;
    }

    if (type === 'deposit') {
      const method = this.paymentMethods().find((m) => m.id === draft.paymentMethodId);
      const available = method?.currentBalance ?? 0;
      if (draft.amount > available) {
        this.transactionError.set('El monto excede el saldo disponible de la cuenta de origen.');
        return;
      }
    }

    if (type === 'withdrawal' && draft.amount > acc.balance) {
      this.transactionError.set('El monto excede el saldo disponible.');
      return;
    }

    try {
      if (type === 'deposit') {
        await this.service.deposit(acc.id, draft.amount, draft.paymentMethodId, draft.description.trim() || undefined);
        this.toast.show('Depósito registrado.');
      } else if (type === 'withdrawal') {
        await this.service.withdraw(acc.id, draft.amount, draft.paymentMethodId, draft.description.trim() || undefined);
        this.toast.show('Retiro registrado.');
      } else {
        await this.service.addYield(acc.id, draft.amount);
        this.toast.show('Rendimiento registrado.');
      }
      this.closeTransactionForm();
      await this.load();
    } catch (error) {
      this.transactionError.set(error instanceof Error ? error.message : 'No se pudo registrar.');
    }
  }

  protected openEditForm(): void {
    const acc = this.account();
    if (!acc) return;
    this.editDraft.set({ name: acc.name, icon: acc.icon, goal: acc.goal ?? 0 });
    this.editDraftIcon.set(acc.icon);
    this.editError.set(null);
    this.showEditForm.set(true);
  }

  protected closeEditForm(): void {
    this.showEditForm.set(false);
    this.editError.set(null);
  }

  protected onEditDraftChange(field: 'name' | 'icon' | 'goal', value: string | number): void {
    this.editDraft.update((d) => ({ ...d, [field]: value }));
  }

  protected async saveEdit(): Promise<void> {
    const acc = this.account();
    const draft = this.editDraft();
    const icon = this.editDraftIcon();
    if (!acc || acc.id === undefined) return;

    if (!draft.name.trim()) {
      this.editError.set('El nombre es obligatorio.');
      return;
    }

    try {
      await this.service.update(acc.id, {
        name: draft.name.trim(),
        icon,
        goal: draft.goal > 0 ? draft.goal : undefined,
      });
      this.toast.show('Cuenta actualizada.');
      this.closeEditForm();
      await this.load();
    } catch (error) {
      this.editError.set(error instanceof Error ? error.message : 'No se pudo actualizar.');
    }
  }

  protected openScheduledForm(): void {
    const acc = this.account();
    if (!acc) return;
    const config = acc.scheduledSaving;
    this.scheduledDraft.set({
      paymentMethodId: config?.paymentMethodId ?? 0,
      amount: config?.amount ?? 0,
      frequency: config?.frequency ?? 'monthly',
      dayOfMonth: config?.dayOfMonth ?? 1,
      isActive: config?.isActive ?? true,
    });
    this.scheduledError.set(null);
    this.showScheduledForm.set(true);
  }

  protected closeScheduledForm(): void {
    this.showScheduledForm.set(false);
    this.scheduledError.set(null);
  }

  protected onScheduledDraftChange(field: string, value: number | string | boolean | null): void {
    this.scheduledDraft.update((d) => ({ ...d, [field]: value ?? 0 }));
  }

  protected onScheduledFrequencyChange(value: SavingFrequency): void {
    this.scheduledDraft.update((d) => ({ ...d, frequency: value }));
  }

  protected async saveScheduledSaving(): Promise<void> {
    const acc = this.account();
    if (!acc || acc.id === undefined) return;
    const draft = this.scheduledDraft();

    if (draft.paymentMethodId === 0) {
      this.scheduledError.set('Selecciona una cuenta de origen.');
      return;
    }
    if (draft.amount <= 0) {
      this.scheduledError.set('El monto debe ser mayor a 0.');
      return;
    }

    try {
      const config: ScheduledSavingConfig = {
        paymentMethodId: draft.paymentMethodId,
        amount: draft.amount,
        frequency: draft.frequency,
        dayOfMonth: draft.frequency === 'monthly' ? draft.dayOfMonth : undefined,
        isActive: draft.isActive,
      };
      await this.service.update(acc.id, { scheduledSaving: config });
      this.toast.show('Ahorro programado configurado.');
      this.closeScheduledForm();
      await this.load();
    } catch (error) {
      this.scheduledError.set(error instanceof Error ? error.message : 'No se pudo guardar.');
    }
  }

  protected async disableScheduledSaving(): Promise<void> {
    const acc = this.account();
    if (!acc || acc.id === undefined) return;
    try {
      await this.service.update(acc.id, { scheduledSaving: undefined });
      this.toast.show('Ahorro programado desactivado.');
      await this.load();
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'No se pudo desactivar.');
    }
  }

  protected frequencyLabel(frequency?: SavingFrequency): string {
    switch (frequency) {
      case 'monthly': return 'Mensual';
      case 'biweekly': return 'Quincenal';
      case 'weekly': return 'Semanal';
      default: return '';
    }
  }

  private async load(): Promise<void> {
    const [account, transactions, summary, paymentMethods] = await Promise.all([
      this.service.getById(this.accountId),
      this.service.getTransactions(this.accountId),
      this.service.getAccountSummary(this.accountId),
      this.paymentMethodService.getAll(),
    ]);
    this.account.set(account ?? null);
    this.transactions.set(transactions);
    this.summary.set(summary);
    this.paymentMethods.set(paymentMethods);
  }
}
