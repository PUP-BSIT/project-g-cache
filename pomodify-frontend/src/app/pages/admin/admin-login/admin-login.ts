import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ensurePublicPageLightTheme } from '../../../shared/theme';

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

  readonly loginForm: FormGroup = this.fb.group({
    username: ['', { validators: [Validators.required] }],
    password: ['', { validators: [Validators.required, Validators.minLength(6)] }],
  });

  isLoading = false;
  passwordVisible = false;
  loginError = '';

  ngOnInit(): void {
    ensurePublicPageLightTheme();
    // Check if already logged in
    if (sessionStorage.getItem('adminAuth') === 'true') {
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

    // Simple hardcoded admin auth (frontend-only for now)
    setTimeout(() => {
      if (username === 'admin' && password === 'admin123') {
        sessionStorage.setItem('adminAuth', 'true');
        this.router.navigate(['/admin/dashboard']);
      } else {
        this.loginError = 'Invalid admin credentials';
      }
      this.isLoading = false;
    }, 500);
  }

  onBack(): void {
    this.router.navigate(['/']);
  }
}
