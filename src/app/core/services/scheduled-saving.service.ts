import { Injectable, inject } from '@angular/core';

import { database } from '../database/bolsi.database';
import type { ScheduledSaving } from '../models/scheduled-saving.model';
import type { ScheduledSavingExecution } from '../models/scheduled-saving-execution.model';
import { SavingsService } from './savings.service';

export interface PendingSaving {
  scheduledSaving: ScheduledSaving;
  occurrences: number;
  executedCount: number;
  pendingAmount: number;
}

@Injectable({ providedIn: 'root' })
export class ScheduledSavingService {
  private readonly savingsService = inject(SavingsService);

  async getAll(): Promise<ScheduledSaving[]> {
    return database.scheduledSavings.toArray();
  }

  async getActive(): Promise<ScheduledSaving[]> {
    return database.scheduledSavings.where('isActive').equals(1).toArray();
  }

  async getById(id: number): Promise<ScheduledSaving | undefined> {
    return database.scheduledSavings.get(id);
  }

  async create(saving: Omit<ScheduledSaving, 'id'>): Promise<number> {
    this.validate(saving);
    const id = await database.scheduledSavings.add(saving as ScheduledSaving);
    return id as number;
  }

  async update(id: number, updates: Partial<ScheduledSaving>): Promise<void> {
    await database.scheduledSavings.update(id, updates);
  }

  async delete(id: number): Promise<void> {
    await database.scheduledSavingExecutions.where('scheduledSavingId').equals(id).delete();
    await database.scheduledSavings.delete(id);
  }

  async getExecutionsForMonth(month: number, year: number): Promise<ScheduledSavingExecution[]> {
    return database.scheduledSavingExecutions
      .where('[month+year]')
      .equals([month, year])
      .toArray();
  }

  async getPendingForMonth(month: number, year: number): Promise<PendingSaving[]> {
    const active = await this.getActive();
    const executions = await this.getExecutionsForMonth(month, year);
    const result: PendingSaving[] = [];

    for (const saving of active) {
      const occurrences = this.calculateOccurrences(saving.frequency, month, year);
      const executedCount = executions.filter(
        (e) => e.scheduledSavingId === saving.id && e.executed,
      ).length;
      const pending = occurrences - executedCount;
      if (pending > 0) {
        result.push({
          scheduledSaving: saving,
          occurrences,
          executedCount,
          pendingAmount: pending * saving.amount,
        });
      }
    }

    return result;
  }

  async getTotalPendingForMonth(month: number, year: number): Promise<number> {
    const pending = await this.getPendingForMonth(month, year);
    return pending.reduce((sum, p) => sum + p.pendingAmount, 0);
  }

  async execute(scheduledSavingId: number, month: number, year: number, occurrenceIndex: number): Promise<void> {
    const saving = await this.getById(scheduledSavingId);
    if (!saving) {
      throw new Error('Ahorro programado no encontrado.');
    }

    await this.savingsService.deposit(
      saving.savingsAccountId,
      saving.amount,
      saving.paymentMethodId,
      `Ahorro programado: ${saving.name}`,
    );

    const existing = await database.scheduledSavingExecutions
      .where('[scheduledSavingId+month+year+occurrenceIndex]')
      .equals([scheduledSavingId, month, year, occurrenceIndex])
      .first();

    if (existing) {
      await database.scheduledSavingExecutions.update(existing.id!, {
        executed: true,
        executedDate: new Date().toISOString().split('T')[0],
        amount: saving.amount,
      });
    } else {
      await database.scheduledSavingExecutions.add({
        scheduledSavingId,
        month,
        year,
        occurrenceIndex,
        executed: true,
        executedDate: new Date().toISOString().split('T')[0],
        amount: saving.amount,
      });
    }
  }

  async getDueSavings(month: number, year: number): Promise<PendingSaving[]> {
    const pending = await this.getPendingForMonth(month, year);
    const today = new Date();
    const dayOfMonth = today.getDate();

    return pending.filter((p) => {
      const saving = p.scheduledSaving;
      switch (saving.frequency) {
        case 'monthly':
          return saving.dayOfMonth !== undefined && dayOfMonth >= saving.dayOfMonth;
        case 'biweekly':
          return true;
        case 'weekly':
          return true;
        default:
          return false;
      }
    });
  }

  calculateOccurrences(frequency: ScheduledSaving['frequency'], _month: number, _year: number): number {
    switch (frequency) {
      case 'monthly':
        return 1;
      case 'biweekly':
        return 2;
      case 'weekly':
        return 4;
      default:
        return 1;
    }
  }

  async replicateToNextMonth(
    originMonth: number,
    originYear: number,
    targetMonth: number,
    targetYear: number,
  ): Promise<number> {
    const active = await this.getActive();
    if (active.length === 0) return 0;

    const executions = await this.getExecutionsForMonth(originMonth, originYear);
    let replicated = 0;

    for (const saving of active) {
      const originOccurrences = this.calculateOccurrences(saving.frequency, originMonth, originYear);
      const executedCount = executions.filter(
        (e) => e.scheduledSavingId === saving.id && e.executed,
      ).length;

      if (executedCount >= originOccurrences) {
        replicated++;
      }
    }

    return replicated;
  }

  private validate(saving: Omit<ScheduledSaving, 'id'>): void {
    if (!saving.name.trim()) {
      throw new Error('El nombre es obligatorio.');
    }
    if (!Number.isFinite(saving.amount) || saving.amount <= 0) {
      throw new Error('El monto debe ser mayor a 0.');
    }
    if (!saving.savingsAccountId) {
      throw new Error('Selecciona una cuenta de ahorro destino.');
    }
    if (!saving.paymentMethodId) {
      throw new Error('Selecciona una cuenta de origen.');
    }
    if (saving.frequency === 'monthly' && (saving.dayOfMonth === undefined || saving.dayOfMonth < 1 || saving.dayOfMonth > 31)) {
      throw new Error('El día del mes debe estar entre 1 y 31.');
    }
  }
}
