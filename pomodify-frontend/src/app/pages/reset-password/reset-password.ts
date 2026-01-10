import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatSnackBarModule
  ],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.scss']
})
export class ResetPasswordPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private snackBar = inject(MatSnackBar);

  // Password pattern: at least 1 uppercase, 1 lowercase, 1 number, 1 special char
  private readonly passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  form: FormGroup;
  token: string | null = null;
  isLoading = false;
  isValidating = true;
  isValidToken = false;
  isSuccess = false;
  showPassword = false;
  showConfirmPassword = false;
  submitted = false;

  // Password strength indicators
  get passwordHasLowercase(): boolean {
    return /[a-z]/.test(this.form.get('password')?.value || '');
  }
  get passwordHasUppercase(): boolean {
    return /[A-Z]/.test(this.form.get('password')?.value || '');
  }
  get passwordHasNumber(): boolean {
    return /\d/.test(this.form.get('password')?.value || '');
  }
  get passwordHasSpecial(): boolean {
    return /[@$!%*?&]/.test(this.form.get('password')?.value || '');
  }
  get passwordHasMinLength(): boolean {
    return (this.form.get('password')?.value || '').length >= 8;
  }
  
  // Password strength score (0-5)
  get passwordStrengthScore(): number {
    let score = 0;
    if (this.passwordHasMinLength) score++;
    if (this.passwordHasLowercase) score++;
    if (this.passwordHasUppercase) score++;
    if (this.passwordHasNumber) score++;
    if (this.passwordHasSpecial) score++;
    return score;
  }
  
  get passwordStrengthLabel(): string {
    const score = this.passwordStrengthScore;
    if (score <= 1) return 'Weak';
    if (score <= 2) return 'Fair';
    if (score <= 4) return 'Good';
    return 'Strong';
  }
  
  get passwordStrengthClass(): string {
    const score = this.passwordStrengthScore;
    if (score <= 1) return 'weak';
    if (score <= 2) return 'fair';
    if (score <= 4) return 'good';
    return 'strong';
  }

  constructor() {
    this.form = this.fb.group({
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(50),
        Validators.pattern(this.passwordPattern)
      ]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token');
    
    // Simulate token validation (in real app, you'd validate with backend)
    setTimeout(() => {
      this.isValidating = false;
      if (this.token) {
        this.isValidToken = true;
      } else {
        this.isValidToken = false;
      }
    }, 500);
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  togglePasswordVisibility(field: 'password' | 'confirm') {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  async onSubmit() {
    this.submitted = true;
    if (this.form.invalid || !this.token) return;

    this.isLoading = true;
    const password = this.form.get('password')?.value;

    try {
      await this.auth.resetPassword(this.token, password);
      this.isSuccess = true;
    } catch (error: any) {
      // Extract error message from backend response if available
      const errorMessage = error?.error?.message || error?.message || 'Failed to reset password. The link may have expired.';
      this.snackBar.open(errorMessage, 'Close', { 
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isLoading = false;
    }
  }
}
