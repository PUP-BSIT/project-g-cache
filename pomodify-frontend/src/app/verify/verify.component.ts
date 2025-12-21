import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { API } from '../core/config/api.config';

@Component({
  selector: 'app-verify',
  templateUrl: './verify.component.html',
  styleUrls: ['./verify.component.scss']
})
export class VerifyComponent implements OnInit {
  success: boolean | null = null;
  message: string = '';

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.http.get<{ success: boolean, message: string }>(`${API.USER.VERIFY_EMAIL}?token=${token}`)
        .subscribe({
          next: res => {
            this.success = res.success;
            this.message = res.message;
          },
          error: err => {
            this.success = false;
            this.message = err.error?.message || 'Verification failed.';
          }
        });
    } else {
      this.success = false;
      this.message = 'No token provided.';
    }
  }
}
