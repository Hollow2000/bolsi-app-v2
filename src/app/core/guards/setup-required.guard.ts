import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { SettingsService } from '../services/settings.service';

export const setupRequiredGuard: CanActivateFn = async () => {
  const settings = inject(SettingsService);
  const router = inject(Router);
  const complete = await settings.isSetupComplete();
  if (complete) {
    return true;
  }
  return router.createUrlTree(['/onboarding']);
};
