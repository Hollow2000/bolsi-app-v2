import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { DEFAULT_POCKETS, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../core/catalogs';
import type { Income } from '../../core/models/income.model';
import type { MonthlyPayment } from '../../core/models/monthly-payment.model';
import type { PaymentMethod, PaymentMethodType } from '../../core/models/payment-method.model';
import type { Pocket } from '../../core/models/pocket.model';
import { IncomeService } from '../../core/services/income.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { PocketService } from '../../core/services/pocket.service';
import { SettingsService } from '../../core/services/settings.service';

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
  category: string;
  paymentMethodId: number;
  frequency: Income['frequency'];
  status: Income['status'];
}

interface PocketDraft {
  name: string;
  emoji: string;
  percentage: number;
}

@Component({
  selector: 'app-onboarding',
  imports: [FormsModule],
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

  protected readonly expenseCategories = EXPENSE_CATEGORIES;
  protected readonly incomeCategories = INCOME_CATEGORIES;
  protected readonly installmentOptions = [3, 6, 9, 12, 18, 24] as const;

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
      return this.incomes().length > 0;
    }
    if (step === 4) {
      return this.pockets().length > 0 && this.pocketTotalRounded() === 100;
    }
    return true;
  });

  protected next(): void {
    if (!this.canAdvance()) {
      return;
    }
    this.currentStep.update((step) => (step < 5 ? ((step + 1) as WizardStep) : step));
  }

  protected back(): void {
    this.currentStep.update((step) => (step > 1 ? ((step - 1) as WizardStep) : step));
  }

  protected goToStep(step: WizardStep): void {
    if (step < this.currentStep()) {
      this.currentStep.set(step);
    }
  }

  protected onUserNameChange(value: string): void {
    this.userName.set(value);
  }

  protected onPaymentMethodTypeChange(type: PaymentMethodType): void {
    this.paymentMethodDraft.update((draft) => ({ ...draft, type }));
  }

  protected onPaymentMethodNameChange(value: string): void {
    this.paymentMethodDraft.update((draft) => ({ ...draft, name: value }));
  }

  protected onPaymentMethodBalanceChange(value: string): void {
    const numeric = this.parseAmount(value);
    this.paymentMethodDraft.update((draft) => ({ ...draft, currentBalance: numeric }));
  }

  protected onPaymentMethodLimitChange(value: string): void {
    const numeric = this.parseAmount(value);
    this.paymentMethodDraft.update((draft) => ({ ...draft, creditLimit: numeric }));
  }

  protected onPaymentMethodClosingDayChange(value: string): void {
    const numeric = this.parseInteger(value, 1, 31);
    this.paymentMethodDraft.update((draft) => ({ ...draft, statementClosingDay: numeric }));
  }

  protected onPaymentMethodCreditDaysChange(value: string): void {
    const numeric = this.parseInteger(value, 1, 60);
    this.paymentMethodDraft.update((draft) => ({ ...draft, creditDays: numeric }));
  }

  protected addPaymentMethod(): void {
    const draft = this.paymentMethodDraft();
    const trimmedName = draft.name.trim();
    if (!trimmedName) {
      return;
    }
    const tempId = this.nextPaymentMethodTempId--;
    if (draft.type === 'credit') {
      if (draft.creditLimit <= 0) {
        return;
      }
      if (draft.statementClosingDay < 1 || draft.statementClosingDay > 31) {
        return;
      }
      if (draft.creditDays < 1) {
        return;
      }
      this.paymentMethods.update((methods) => [
        ...methods,
        {
          id: tempId,
          type: 'credit',
          name: trimmedName,
          creditLimit: this.roundCurrency(draft.creditLimit),
          availableCredit: this.roundCurrency(draft.creditLimit),
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
          name: trimmedName,
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

  protected onIncomeDraftFieldChange<K extends keyof IncomeDraft>(field: K, value: IncomeDraft[K]): void {
    this.incomeDraft.update((draft) => ({ ...draft, [field]: value }));
  }

  protected addIncome(): void {
    const draft = this.incomeDraft();
    if (!draft.description.trim() || draft.amount <= 0 || !draft.paymentMethodId) {
      return;
    }
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
      category: this.incomeCategories[0],
      paymentMethodId: draft.paymentMethodId,
      frequency: 'monthly',
      status: 'received',
    });
  }

  protected removeIncome(index: number): void {
    this.incomes.update((items) => items.filter((_, i) => i !== index));
  }

  protected onPocketDraftFieldChange<K extends keyof PocketDraft>(field: K, value: PocketDraft[K]): void {
    this.pocketDraft.update((draft) => ({ ...draft, [field]: value }));
  }

  protected onPocketPercentageChange(value: string): void {
    const numeric = this.parseAmount(value);
    this.pocketDraft.update((draft) => ({ ...draft, percentage: numeric }));
  }

  protected addPocket(): void {
    const draft = this.pocketDraft();
    const name = draft.name.trim();
    if (!name || draft.percentage <= 0) {
      return;
    }
    this.pockets.update((pockets) => [
      ...pockets,
      {
        name,
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

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 2,
    }).format(value);
  }

  protected paymentMethodTypeLabel(type: PaymentMethodType): string {
    if (type === 'cash') return 'Efectivo';
    if (type === 'debit') return 'Débito';
    return 'Crédito';
  }

  protected frequencyLabel(frequency: Income['frequency']): string {
    if (frequency === 'one-time') return 'Única';
    if (frequency === 'monthly') return 'Mensual';
    return 'Quincenal';
  }

  protected statusLabel(status: Income['status']): string {
    return status === 'received' ? 'Recibido' : 'Esperado';
  }

  protected paymentMethodName(id: number): string {
    return this.paymentMethods().find((method) => method.id === id)?.name ?? '—';
  }

  private todayIsoDate(): string {
    const today = new Date();
    return this.toIsoDate(today);
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseAmount(value: string): number {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const numeric = Number(cleaned);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
  }

  private parseInteger(value: string, min: number, max: number): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return min;
    }
    return Math.min(Math.max(Math.trunc(numeric), min), max);
  }

  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
