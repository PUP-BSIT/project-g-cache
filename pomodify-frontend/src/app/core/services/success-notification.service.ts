import { Injectable, signal } from '@angular/core';

export interface NotificationMessage {
  message: string;
  description?: string;
  duration?: number;
  type?: 'success' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class SuccessNotificationService {
  private successNotificationSignal = signal<NotificationMessage | null>(null);
  private errorNotificationSignal = signal<NotificationMessage | null>(null);
  
  successNotification$ = this.successNotificationSignal.asReadonly();
  errorNotification$ = this.errorNotificationSignal.asReadonly();

  showSuccess(message: string, description?: string, duration: number = 5000): void {
    this.successNotificationSignal.set({ message, description, duration, type: 'success' });
    
    setTimeout(() => {
      this.successNotificationSignal.set(null);
    }, duration);
  }

  showError(message: string, description?: string, duration: number = 5000): void {
    this.errorNotificationSignal.set({ message, description, duration, type: 'error' });
    
    setTimeout(() => {
      this.errorNotificationSignal.set(null);
    }, duration);
  }

  hideSuccessNotification(): void {
    this.successNotificationSignal.set(null);
  }

  hideErrorNotification(): void {
    this.errorNotificationSignal.set(null);
  }
}
