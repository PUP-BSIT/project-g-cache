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

  form: FormGroup;
  token: string | null = null;
  isLoading = false;
  isValidating = true;
  isValidToken = false;
  isSuccess = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor() {
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
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
    if (this.form.invalid || !this.token) return;

    this.isLoading = true;
    const password = this.form.get('password')?.value;

    try {
      await this.auth.resetPassword(this.token, password);
      this.isSuccess = true;
    } catch (error) {
      this.snackBar.open('Failed to reset password. The link may have expired.', 'Close', { 
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isLoading = false;
    }
  }
}
