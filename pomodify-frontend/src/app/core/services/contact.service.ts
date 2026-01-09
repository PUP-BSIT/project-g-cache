import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ContactRequest {
  name: string;
  email: string;
  reason: string;
  message: string;
}

export interface ContactResponse {
  message: string;
}

// Use the same base URL pattern as the rest of the app
const BASE_URL = "https://apiv2.pomodify.site";

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private http = inject(HttpClient);

  submitContactForm(request: ContactRequest): Observable<ContactResponse> {
    return this.http.post<ContactResponse>(`${BASE_URL}/api/v2/contact`, request);
  }
}
