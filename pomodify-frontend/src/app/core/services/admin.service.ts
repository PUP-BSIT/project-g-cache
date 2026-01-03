import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API } from '../config/api.config';

export interface AdminUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface AdminLoginResponse {
  success: boolean;
  message: string;
}

const ADMIN_API = {
  LOGIN: `${API.ROOT}/admin/login`,
  USERS: `${API.ROOT}/admin/users`,
  SEARCH: `${API.ROOT}/admin/users/search`,
  DELETE: (userId: number) => `${API.ROOT}/admin/users/${userId}`,
};

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);

  login(username: string, password: string): Observable<AdminLoginResponse> {
    return this.http.post<AdminLoginResponse>(ADMIN_API.LOGIN, { username, password });
  }

  getAllUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(ADMIN_API.USERS);
  }

  searchUsers(query: string): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(ADMIN_API.SEARCH, {
      params: query ? { query } : {}
    });
  }

  deleteUser(userId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(ADMIN_API.DELETE(userId));
  }

  isLoggedIn(): boolean {
    return sessionStorage.getItem('adminAuth') === 'true';
  }

  setLoggedIn(value: boolean): void {
    if (value) {
      sessionStorage.setItem('adminAuth', 'true');
    } else {
      sessionStorage.removeItem('adminAuth');
    }
  }
}
