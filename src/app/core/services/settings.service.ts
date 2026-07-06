import { Injectable } from '@angular/core';

import { database } from '../database/bolsi.database';
import type { AppSettings } from '../models/app-settings.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  async get(): Promise<AppSettings | undefined> {
    const records = await database.appSettings.toArray();
    return records[0];
  }

  async save(settings: AppSettings): Promise<void> {
    const existing = await this.get();
    if (existing?.id !== undefined) {
      await database.appSettings.put({ ...settings, id: existing.id });
    } else {
      await database.appSettings.add(settings);
    }
  }

  async isSetupComplete(): Promise<boolean> {
    const record = await this.get();
    return record?.setupComplete === true;
  }
}
