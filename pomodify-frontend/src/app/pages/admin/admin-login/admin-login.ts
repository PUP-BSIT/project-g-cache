import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ensurePublicPageLightTheme } from '../../../shared/theme';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  standalone: true,
  selector: 'app-admin-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-login.html',
  styleUrls: ['./admin-login.scss'],
})
export class AdminLogin implements OnInit {
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);

  readonly loginForm: FormGroup = this.fb.group({
    username: ['', { validators: [Validators.required] }],
    password: ['', { validators: [Validators.required, Validators.minLength(6)] }],
  });

  isLoading = false;
  passwordVisible = false;
  loginError = '';

  ngOnInit(): void {
    ensurePublicPageLightTheme();
    if (this.adminService.isLoggedIn()) {
      this.router.navigate(['/admin/dashboard']);
    }
  }

  get passwordInputType(): 'password' | 'text' {
    return this.passwordVisible ? 'text' : 'password';
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  onSubmit(): void {
    this.loginError = '';
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { username, password } = this.loginForm.getRawValue();
    this.isLoading = true;

    this.adminService.login(username, password).subscribe({
      next: (response) => {
        if (response.success) {
          this.adminService.setLoggedIn(true);
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.loginError = response.message || 'Invalid admin credentials';
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.loginError = err.error?.message || 'Invalid admin credentials';
        this.isLoading = false;
      }
    });
  }

  onBack(): void {
    this.router.navigate(['/']);
  }
}
