import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { DEFAULT_POCKETS, INCOME_CATEGORIES, type IncomeCategory } from '../../core/catalogs';
import type { Income, IncomeFrequency, IncomeStatus } from '../../core/models/income.model';
import type { PaymentMethod, PaymentMethodType } from '../../core/models/payment-method.model';
import type { Pocket } from '../../core/models/pocket.model';
import { IncomeService } from '../../core/services/income.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { PocketService } from '../../core/services/pocket.service';
import { SettingsService } from '../../core/services/settings.service';
import { ButtonDirective } from '../../shared/components/button/button.directive';
import { CardComponent } from '../../shared/components/card/card.component';
import { DateInputComponent } from '../../shared/components/date-input/date-input.component';
import { IconButtonDirective } from '../../shared/components/icon-button/icon-button.directive';
import { NumberInputComponent } from '../../shared/components/number-input/number-input.component';
import { SegmentedControlComponent, type SegmentedOption } from '../../shared/components/segmented-control/segmented-control.component';
import { SelectInputComponent } from '../../shared/components/select-input/select-input.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';
import { MexicanCurrencyPipe } from '../../shared/pipes/mexican-currency.pipe';

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface PaymentMethodDraft {
  type: PaymentMethodType;
  name: string;
  currentBalance: number;
  creditLimit: number;
  statementClosingDay: number;
  creditDays: number;
}

interface IncomeDraft {
  date: string;
  description: string;
  amount: number;
  category: IncomeCategory;
  paymentMethodId: number;
  frequency: IncomeFrequency;
  status: IncomeStatus;
}

interface PocketDraft {
  name: string;
  emoji: string;
  percentage: number;
}

const PAYMENT_METHOD_TYPE_OPTIONS: readonly SegmentedOption<PaymentMethodType>[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'debit', label: 'Débito' },
  { value: 'credit', label: 'Crédito' },
];

const FREQUENCY_OPTIONS: readonly SegmentedOption<IncomeFrequency>[] = [
  { value: 'one-time', label: 'Única' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'biweekly', label: 'Quincenal' },
];

const STATUS_OPTIONS: readonly SegmentedOption<IncomeStatus>[] = [
  { value: 'received', label: 'Recibido' },
  { value: 'expected', label: 'Esperado' },
];

@Component({
  selector: 'app-onboarding',
  imports: [
    ButtonDirective,
    CardComponent,
    DateInputComponent,
    IconButtonDirective,
    MexicanCurrencyPipe,
    NumberInputComponent,
    SegmentedControlComponent,
    SelectInputComponent,
    TextInputComponent,
  ],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingComponent {
  private readonly settingsService = inject(SettingsService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly pocketService = inject(PocketService);
  private readonly incomeService = inject(IncomeService);
  private readonly router = inject(Router);

  protected readonly paymentMethodTypeOptions = PAYMENT_METHOD_TYPE_OPTIONS;
  protected readonly frequencyOptions = FREQUENCY_OPTIONS;
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly incomeCategories = INCOME_CATEGORIES;

  protected readonly currentStep = signal<WizardStep>(1);
  protected readonly userName = signal('');
  protected readonly paymentMethods = signal<PaymentMethod[]>([]);
  protected readonly incomes = signal<Income[]>([]);
  protected readonly pockets = signal<Pocket[]>(
    DEFAULT_POCKETS.map((pocket) => ({ ...pocket })),
  );
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private nextPaymentMethodTempId = 0;

  protected readonly paymentMethodDraft = signal<PaymentMethodDraft>({
    type: 'cash',
    name: '',
    currentBalance: 0,
    creditLimit: 0,
    statementClosingDay: 1,
    creditDays: 20,
  });

  protected readonly incomeDraft = signal<IncomeDraft>({
    date: this.todayIsoDate(),
    description: '',
    amount: 0,
    category: this.incomeCategories[0],
    paymentMethodId: 0,
    frequency: 'monthly',
    status: 'received',
  });

  protected readonly pocketDraft = signal<PocketDraft>({
    name: '',
    emoji: '💼',
    percentage: 0,
  });

  protected readonly pocketTotal = computed(() =>
    this.pockets().reduce((sum, pocket) => sum + pocket.percentage, 0),
  );

  protected readonly pocketTotalRounded = computed(() => Math.round(this.pocketTotal()));

  protected readonly canAdvance = computed(() => {
    const step = this.currentStep();
    if (step === 1) {
      return this.userName().trim().length > 0;
    }
    if (step === 2) {
      return this.paymentMethods().length > 0;
    }
    if (step === 3) {
      return this.incomes().length > 0 && this.hasAnyIncomePaymentMethod();
    }
    if (step === 4) {
      return this.pockets().length > 0 && this.pocketTotalRounded() === 100;
    }
    return true;
  });

  protected readonly canAddPaymentMethod = computed(() => {
    const draft = this.paymentMethodDraft();
    if (!draft.name.trim()) {
      return false;
    }
    if (draft.type === 'credit') {
      return draft.creditLimit > 0 && draft.statementClosingDay >= 1 && draft.statementClosingDay <= 31 && draft.creditDays >= 1;
    }
    return true;
  });

  protected readonly canAddIncome = computed(() => {
    const draft = this.incomeDraft();
    if (!draft.description.trim() || draft.amount <= 0 || draft.paymentMethodId === 0) {
      return false;
    }
    const selected = this.paymentMethods().find((method) => method.id === draft.paymentMethodId);
    return selected !== undefined && selected.type !== 'credit';
  });

  protected readonly canAddPocket = computed(() => {
    const draft = this.pocketDraft();
    return draft.name.trim().length > 0 && draft.percentage > 0;
  });

  /**
   * Ingresos solo pueden asignarse a métodos de pago que no sean
   * tarjetas de crédito (BR — los ingresos no entran a crédito).
   */
  protected readonly incomePaymentMethods = computed(() =>
    this.paymentMethods().filter((method) => method.type !== 'credit'),
  );

  protected readonly hasAnyIncomePaymentMethod = computed(() =>
    this.incomePaymentMethods().length > 0,
  );

  protected next(): void {
    if (!this.canAdvance()) {
      return;
    }
    this.currentStep.update((step) => (step < 5 ? ((step + 1) as WizardStep) : step));
  }

  protected back(): void {
    this.currentStep.update((step) => (step > 1 ? ((step - 1) as WizardStep) : step));
  }

  protected onUserNameChange(value: string): void {
    this.userName.set(value);
  }

  protected onPaymentMethodDraftChange<K extends keyof PaymentMethodDraft>(field: K, value: PaymentMethodDraft[K]): void {
    this.paymentMethodDraft.update((draft) => ({ ...draft, [field]: value }));
  }

  protected onPaymentMethodTypeChange(type: PaymentMethodType): void {
    this.paymentMethodDraft.update((draft) => ({ ...draft, type }));
  }

  protected onPaymentMethodNameChange(value: string): void {
    this.onPaymentMethodDraftChange('name', value);
  }

  protected onPaymentMethodBalanceChange(value: number): void {
    this.onPaymentMethodDraftChange('currentBalance', value);
  }

  protected onPaymentMethodLimitChange(value: number): void {
    this.onPaymentMethodDraftChange('creditLimit', value);
  }

  protected onPaymentMethodClosingDayChange(value: number): void {
    this.onPaymentMethodDraftChange('statementClosingDay', Math.min(31, Math.max(1, Math.trunc(value) || 1)));
  }

  protected onPaymentMethodCreditDaysChange(value: number): void {
    this.onPaymentMethodDraftChange('creditDays', Math.max(1, Math.trunc(value) || 1));
  }

  protected addPaymentMethod(): void {
    if (!this.canAddPaymentMethod()) {
      return;
    }
    const draft = this.paymentMethodDraft();
    const tempId = this.nextPaymentMethodTempId--;
    if (draft.type === 'credit') {
      const creditLimit = this.roundCurrency(draft.creditLimit);
      this.paymentMethods.update((methods) => [
        ...methods,
        {
          id: tempId,
          type: 'credit',
          name: draft.name.trim(),
          creditLimit,
          availableCredit: creditLimit,
          statementClosingDay: draft.statementClosingDay,
          creditDays: draft.creditDays,
        },
      ]);
    } else {
      this.paymentMethods.update((methods) => [
        ...methods,
        {
          id: tempId,
          type: draft.type,
          name: draft.name.trim(),
          currentBalance: this.roundCurrency(draft.currentBalance),
        },
      ]);
    }
    this.paymentMethodDraft.set({
      type: draft.type,
      name: '',
      currentBalance: 0,
      creditLimit: 0,
      statementClosingDay: 1,
      creditDays: 20,
    });
  }

  protected removePaymentMethod(index: number): void {
    this.paymentMethods.update((methods) => methods.filter((_, i) => i !== index));
  }

  protected onIncomeDraftChange<K extends keyof IncomeDraft>(field: K, value: IncomeDraft[K]): void {
    this.incomeDraft.update((draft) => ({ ...draft, [field]: value }));
  }

  protected onIncomeDescriptionChange(value: string): void {
    this.onIncomeDraftChange('description', value);
  }

  protected onIncomeAmountChange(value: number): void {
    this.onIncomeDraftChange('amount', value);
  }

  protected onIncomeDateChange(value: string): void {
    this.onIncomeDraftChange('date', value);
  }

  protected onIncomePaymentMethodIdChange(value: number | string | null): void {
    this.onIncomeDraftChange('paymentMethodId', typeof value === 'number' ? value : 0);
  }

  protected onIncomeCategoryChange(value: number | string | null): void {
    if (typeof value === 'string') {
      this.onIncomeDraftChange('category', value as IncomeCategory);
    }
  }

  protected onIncomeFrequencyChange(value: IncomeFrequency | null): void {
    if (value !== null) {
      this.onIncomeDraftChange('frequency', value);
    }
  }

  protected onIncomeStatusChange(value: IncomeStatus | null): void {
    if (value !== null) {
      this.onIncomeDraftChange('status', value);
    }
  }

  protected addIncome(): void {
    if (!this.canAddIncome()) {
      return;
    }
    const draft = this.incomeDraft();
    const parts = draft.date.split('-').map((segment) => Number(segment));
    if (parts.length !== 3 || parts.some((segment) => Number.isNaN(segment))) {
      return;
    }
    const [year, month] = parts;
    this.incomes.update((incomes) => [
      ...incomes,
      {
        date: draft.date,
        description: draft.description.trim(),
        amount: this.roundCurrency(draft.amount),
        category: draft.category,
        paymentMethodId: draft.paymentMethodId,
        frequency: draft.frequency,
        status: draft.status,
        month,
        year,
      },
    ]);
    this.incomeDraft.set({
      date: this.todayIsoDate(),
      description: '',
      amount: 0,
      category: draft.category,
      paymentMethodId: draft.paymentMethodId,
      frequency: 'monthly',
      status: 'received',
    });
  }

  protected removeIncome(index: number): void {
    this.incomes.update((items) => items.filter((_, i) => i !== index));
  }

  protected onPocketDraftChange<K extends keyof PocketDraft>(field: K, value: PocketDraft[K]): void {
    this.pocketDraft.update((draft) => ({ ...draft, [field]: value }));
  }

  protected onPocketNameChange(value: string): void {
    this.onPocketDraftChange('name', value);
  }

  protected onPocketEmojiChange(value: string): void {
    this.onPocketDraftChange('emoji', value);
  }

  protected onPocketPercentageChange(value: number): void {
    this.onPocketDraftChange('percentage', value);
  }

  protected addPocket(): void {
    if (!this.canAddPocket()) {
      return;
    }
    const draft = this.pocketDraft();
    this.pockets.update((pockets) => [
      ...pockets,
      {
        name: draft.name.trim(),
        emoji: draft.emoji || '💼',
        percentage: this.roundCurrency(draft.percentage),
        sortOrder: pockets.length,
      },
    ]);
    this.pocketDraft.set({ name: '', emoji: '💼', percentage: 0 });
  }

  protected removePocket(index: number): void {
    this.pockets.update((pockets) => pockets.filter((_, i) => i !== index));
  }

  protected balancePockets(): void {
    const total = this.pocketTotal();
    if (total === 0) {
      return;
    }
    this.pockets.update((pockets) => {
      const scaled = pockets.map((pocket) => ({
        ...pocket,
        percentage: this.roundCurrency((pocket.percentage / total) * 100),
      }));
      const residual = this.roundCurrency(100 - scaled.reduce((sum, p) => sum + p.percentage, 0));
      if (scaled.length > 0) {
        scaled[0] = { ...scaled[0], percentage: this.roundCurrency(scaled[0].percentage + residual) };
      }
      return scaled;
    });
  }

  protected async confirm(): Promise<void> {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    try {
      const paymentMethodIdMap = new Map<number, number>();
      for (const paymentMethod of this.paymentMethods()) {
        const tempId = paymentMethod.id as number;
        const { id: _id, ...rest } = paymentMethod;
        const realId = await this.paymentMethodService.create(rest);
        paymentMethodIdMap.set(tempId, realId);
      }
      for (const pocket of this.pockets()) {
        const { id: _id, ...rest } = pocket;
        await this.pocketService.create(rest);
      }
      for (const income of this.incomes()) {
        const { id: _id, ...rest } = income;
        const realPaymentMethodId = paymentMethodIdMap.get(income.paymentMethodId);
        if (realPaymentMethodId === undefined) {
          throw new Error('Ingreso referencia un método de pago inexistente.');
        }
        await this.incomeService.create({ ...rest, paymentMethodId: realPaymentMethodId });
      }
      await this.settingsService.save({
        userName: this.userName().trim(),
        setupComplete: true,
      });
      await this.router.navigate(['/dashboard']);
    } catch (error) {
      this.errorMessage.set('No pudimos guardar tu configuración. Intenta de nuevo.');
      console.error('Onboarding save error', error);
    } finally {
      this.saving.set(false);
    }
  }

  protected paymentMethodName(id: number): string {
    return this.paymentMethods().find((method) => method.id === id)?.name ?? '—';
  }

  protected paymentMethodTypeLabel(type: PaymentMethodType): string {
    if (type === 'cash') return 'Efectivo';
    if (type === 'debit') return 'Débito';
    return 'Crédito';
  }

  protected frequencyLabel(frequency: IncomeFrequency): string {
    if (frequency === 'one-time') return 'Única';
    if (frequency === 'monthly') return 'Mensual';
    return 'Quincenal';
  }

  protected statusLabel(status: IncomeStatus): string {
    return status === 'received' ? 'Recibido' : 'Esperado';
  }

  private todayIsoDate(): string {
    return this.toIsoDate(new Date());
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
