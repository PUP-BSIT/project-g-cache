import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { API } from '../core/config/api.config';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './verify.component.html',
  styleUrls: ['./verify.component.scss']
})
export class VerifyComponent implements OnInit {
  success: boolean | null = null;
  message: string = '';
  isExpired = false;

  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private router = inject(Router);

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.http.get<{ success: boolean, message: string }>(`${API.USER.VERIFY_EMAIL}?token=${token}`)
        .subscribe({
          next: res => {
            this.success = res.success;
            this.message = res.message;
            setTimeout(() => this.router.navigate(['/login']), 3000);
          },
          error: err => {
            this.success = false;
            this.message = err.error?.message || 'Verification failed.';
            if (this.message.toLowerCase().includes('expired')) {
                this.isExpired = true;
            }
          }
        });
    } else {
      this.success = false;
      this.message = 'No token provided.';
    }
  }

  onLogin() {
      this.router.navigate(['/login']);
  }
}
