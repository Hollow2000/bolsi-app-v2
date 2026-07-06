import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { SettingsService } from '../services/settings.service';

export const setupCompleteGuard: CanActivateFn = async () => {
  const settings = inject(SettingsService);
  const router = inject(Router);
  const complete = await settings.isSetupComplete();
  if (complete) {
    return router.createUrlTree(['/dashboard']);
  }
  return true;
};
