import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { DataRefreshService } from './data-refresh.service';

describe('DataRefreshService', () => {
  let service: DataRefreshService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataRefreshService);
  });

  it('starts at version 0', () => {
    expect(service.version()).toBe(0);
  });

  it('increments the version on notify()', () => {
    service.notify();
    expect(service.version()).toBe(1);
    service.notify();
    service.notify();
    expect(service.version()).toBe(3);
  });
});
