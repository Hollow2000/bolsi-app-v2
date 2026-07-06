import { Injectable } from '@angular/core';

import { database } from '../database/bolsi.database';
import type { Pocket } from '../models/pocket.model';

@Injectable({ providedIn: 'root' })
export class PocketService {
  async getAll(): Promise<Pocket[]> {
    return database.pockets.orderBy('sortOrder').toArray();
  }

  async create(pocket: Pocket): Promise<number> {
    const id = await database.pockets.add(pocket);
    return id as number;
  }

  async update(pocket: Pocket): Promise<void> {
    await database.pockets.put(pocket);
  }

  async delete(id: number): Promise<void> {
    await database.pockets.delete(id);
  }
}
