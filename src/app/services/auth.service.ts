import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';

// ─── OWNER CREDENTIALS ────────────────────────────────────────────────────────
// Change these to whatever username and password YOU want to use.
const OWNER_USERNAME = 'leedstore_owner';
const OWNER_PASSWORD = 'Leed@2026!';
const SESSION_KEY    = 'leedstore_admin_session';
// ──────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router     = inject(Router);

  // true = owner is logged in, false = nobody is logged in
  private readonly loggedIn$ = new BehaviorSubject<boolean>(this.loadSession());

  /** Observable — components subscribe to know if the owner is logged in */
  readonly isLoggedIn$ = this.loggedIn$.asObservable();

  /** Quick synchronous check used by the route guard */
  get isLoggedIn(): boolean {
    return this.loggedIn$.value;
  }

  /**
   * Attempt a login. Returns true on success, false on wrong credentials.
   * On success, saves a session flag to localStorage so the page can refresh
   * without logging the owner out.
   */
  login(username: string, password: string): boolean {
    const ok = username.trim() === OWNER_USERNAME && password === OWNER_PASSWORD;
    if (ok) {
      this.saveSession();
      this.loggedIn$.next(true);
    }
    return ok;
  }

  /** Log the owner out, clear the session, redirect to home */
  logout(): void {
    this.clearSession();
    this.loggedIn$.next(false);
    this.router.navigate(['/']);
  }

  // ── session helpers ──────────────────────────────────────────────────────────

  private loadSession(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(SESSION_KEY) === 'true';
    }
    return false;
  }

  private saveSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(SESSION_KEY, 'true');
    }
  }

  private clearSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(SESSION_KEY);
    }
  }
}
