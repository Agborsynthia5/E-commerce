import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MOCK_USERS } from '../data/mock-data';
import { User, UserRole } from '../models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly currentUserSubject = new BehaviorSubject<User>(MOCK_USERS[0]);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  getCurrentUser(): User {
    return this.currentUserSubject.value;
  }

  setRole(role: UserRole): void {
    const user = MOCK_USERS.find((u) => u.role === role) || MOCK_USERS[0];
    this.currentUserSubject.next(user);
  }

  switchUser(): void {
    const nextUser = this.currentUserSubject.value.role === 'customer' ? MOCK_USERS[1] : MOCK_USERS[0];
    this.currentUserSubject.next(nextUser);
  }
}
