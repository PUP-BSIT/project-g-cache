import { Injectable, signal } from '@angular/core';

export interface SuccessMessage {
  message: string;
  description?: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SuccessNotificationService {
  private notificationSignal = signal<SuccessMessage | null>(null);
  notification$ = this.notificationSignal.asReadonly();

  showSuccess(message: string, description?: string, duration: number = 5000): void {
    this.notificationSignal.set({ message, description, duration });
    
    setTimeout(() => {
      this.notificationSignal.set(null);
    }, duration);
  }

  hideNotification(): void {
    this.notificationSignal.set(null);
  }
}
