import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css',
})
export class AdminLoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);

  username  = '';
  password  = '';
  showPass  = signal(false);
  errorMsg  = signal('');
  isLoading = signal(false);

  togglePassword(): void {
    this.showPass.update(v => !v);
  }

  onSubmit(): void {
    this.errorMsg.set('');

    if (!this.username.trim() || !this.password) {
      this.errorMsg.set('Please enter both username and password.');
      return;
    }

    this.isLoading.set(true);

    // Small delay so it feels like a real login check
    setTimeout(() => {
      const success = this.authService.login(this.username, this.password);
      this.isLoading.set(false);

      if (success) {
        this.router.navigate(['/admin']);
      } else {
        this.errorMsg.set('Incorrect username or password. Try again.');
        this.password = '';
      }
    }, 600);
  }
}
