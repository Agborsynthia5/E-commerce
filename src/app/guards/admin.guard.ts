import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route Guard — protects every /admin route.
 *
 * How it works:
 *  • If the owner is logged in  → let them through (return true)
 *  • If nobody is logged in     → redirect to /admin/login and block access
 */
export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn) {
    return true;
  }

  // Not logged in → send to the login page
  router.navigate(['/admin/login']);
  return false;
};
