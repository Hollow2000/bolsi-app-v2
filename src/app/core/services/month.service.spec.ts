import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppSettings } from '../models/app-settings.model';
import { BudgetService } from './budget.service';
import { IncomeService } from './income.service';
import { MonthlyPaymentService } from './monthly-payment.service';
import { MonthService } from './month.service';
import { SettingsService } from './settings.service';

describe('MonthService.autoReplicateIfNeeded', () => {
  const currentKey = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  };

  let service: MonthService;
  let settingsRecord: AppSettings | undefined;
  const settingsGet = vi.fn();
  const settingsSave = vi.fn();
  const replicatePayments = vi.fn();
  const replicateBudgets = vi.fn();
  const replicateIncomes = vi.fn();

  beforeEach(() => {
    settingsRecord = undefined;
    settingsGet.mockReset();
    settingsSave.mockReset();
    replicatePayments.mockReset();
    replicateBudgets.mockReset();
    replicateIncomes.mockReset();

    settingsGet.mockImplementation(async () => settingsRecord);
    settingsSave.mockImplementation(async (settings: AppSettings) => {
      settingsRecord = settings;
    });
    replicatePayments.mockResolvedValue(0);
    replicateBudgets.mockResolvedValue(0);
    replicateIncomes.mockResolvedValue(0);

    TestBed.configureTestingModule({
      providers: [
        MonthService,
        { provide: SettingsService, useValue: { get: settingsGet, save: settingsSave } },
        { provide: MonthlyPaymentService, useValue: { replicateRecurring: replicatePayments } },
        { provide: BudgetService, useValue: { replicateBudgets } },
        { provide: IncomeService, useValue: { replicateRecurring: replicateIncomes } },
      ],
    });
    service = TestBed.inject(MonthService);
  });

  it('does not write settings or replicate before onboarding is complete', async () => {
    settingsRecord = undefined;

    await service.autoReplicateIfNeeded();

    expect(replicatePayments).not.toHaveBeenCalled();
    expect(replicateBudgets).not.toHaveBeenCalled();
    expect(replicateIncomes).not.toHaveBeenCalled();
    expect(settingsSave).not.toHaveBeenCalled();
  });

  it('does not run when setupComplete is false', async () => {
    settingsRecord = { userName: '', setupComplete: false };

    await service.autoReplicateIfNeeded();

    expect(replicatePayments).not.toHaveBeenCalled();
    expect(settingsSave).not.toHaveBeenCalled();
  });

  it('replicates payments, budgets, and incomes when setup is complete', async () => {
    settingsRecord = { userName: 'Ana', setupComplete: true };
    replicatePayments.mockResolvedValue(2);
    replicateBudgets.mockResolvedValue(3);
    replicateIncomes.mockResolvedValue(4);

    await service.autoReplicateIfNeeded();

    expect(replicatePayments).toHaveBeenCalledTimes(1);
    expect(replicateBudgets).toHaveBeenCalledTimes(1);
    expect(replicateIncomes).toHaveBeenCalledTimes(1);
    expect(settingsSave).toHaveBeenCalledTimes(1);
    const saved = settingsSave.mock.calls[0][0] as AppSettings;
    expect(saved.setupComplete).toBe(true);
    expect(saved.replicatedMonths).toEqual([currentKey()]);
    expect(saved.replicatedIncomeMonths).toEqual([currentKey()]);
    expect(saved.userName).toBe('Ana');
  });

  it('replicates incomes even when payments/budgets were already replicated (migration)', async () => {
    settingsRecord = {
      userName: 'Ana',
      setupComplete: true,
      replicatedMonths: [currentKey()],
    };
    replicateIncomes.mockResolvedValue(2);

    await service.autoReplicateIfNeeded();

    expect(replicatePayments).not.toHaveBeenCalled();
    expect(replicateBudgets).not.toHaveBeenCalled();
    expect(replicateIncomes).toHaveBeenCalledTimes(1);
    const saved = settingsSave.mock.calls[0][0] as AppSettings;
    expect(saved.replicatedIncomeMonths).toEqual([currentKey()]);
  });

  it('is a no-op when both payment and income months are already replicated', async () => {
    settingsRecord = {
      userName: 'Ana',
      setupComplete: true,
      replicatedMonths: [currentKey()],
      replicatedIncomeMonths: [currentKey()],
    };

    await service.autoReplicateIfNeeded();

    expect(replicatePayments).not.toHaveBeenCalled();
    expect(replicateBudgets).not.toHaveBeenCalled();
    expect(replicateIncomes).not.toHaveBeenCalled();
    expect(settingsSave).not.toHaveBeenCalled();
  });
});