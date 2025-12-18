import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface NotificationModalData {
  title: string;
  body: string;
  type: 'session-complete' | 'phase-complete';
  activityTitle?: string;
  nextAction?: string;
}

@Component({
  selector: 'app-notification-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-modal" [attr.data-type]="data.type">
      <!-- Logo -->
      <div class="logo-container">
        <img src="/assets/images/logo.png" alt="Pomodify" class="logo">
      </div>

      <!-- Header -->
      <div class="modal-header">
        <h2 class="modal-title">{{ data.title }}</h2>
        <p class="modal-message">{{ data.body }}</p>
      </div>

      <!-- Body -->
      <div class="modal-body">
        @if (data.activityTitle) {
          <div class="activity-info">
            <span class="activity-label">Activity</span>
            <span class="activity-name">{{ data.activityTitle }}</span>
          </div>
        }

        @if (data.nextAction) {
          <div class="next-action">
            <svg class="info-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/>
              <path d="M10 6V10M10 14H10.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span class="next-action-text">{{ data.nextAction }}</span>
          </div>
        }
      </div>

      <!-- Actions -->
      <div class="modal-actions">
        <button 
          class="btn-primary" 
          (click)="onOkay()">
          {{ getButtonText() }}
        </button>
        
        @if (data.type === 'phase-complete') {
          <button 
            class="btn-secondary" 
            (click)="onDismiss()">
            Dismiss
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .notification-modal {
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 24px 20px 20px;
      text-align: center;
      max-width: 360px;
      width: 90vw;
      border-radius: 16px;
      background: var(--card, #FFFFFF);
      color: var(--text, #2C3E50);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
      border: 1px solid var(--border, #DEE2E6);
      position: relative;
      overflow: hidden;
    }

    /* Theme support */
    :root.theme-dark .notification-modal {
      background: var(--card, #111827);
      color: var(--text, #E5E7EB);
      border-color: var(--border, #1F2937);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    }

    .logo-container {
      margin-bottom: 16px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .logo {
      width: 48px;
      height: 48px;
      object-fit: contain;
      filter: drop-shadow(0 2px 8px rgba(95, 169, 164, 0.25));
      animation: logoEntrance 0.5s ease-out;
    }

    .modal-header {
      margin-bottom: 20px;
    }

    .modal-title {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: var(--text, #2C3E50);
      line-height: 1.3;
    }

    .modal-message {
      font-size: 15px;
      line-height: 1.4;
      margin: 0;
      color: var(--muted, #6C757D);
      font-weight: 400;
    }

    .modal-body {
      margin-bottom: 24px;
    }

    .activity-info {
      background: rgba(95, 169, 164, 0.06);
      border: 1px solid rgba(95, 169, 164, 0.15);
      padding: 12px 14px;
      border-radius: 10px;
      margin-bottom: 14px;
      text-align: left;
    }

    :root.theme-dark .activity-info {
      background: rgba(95, 169, 164, 0.1);
      border-color: rgba(95, 169, 164, 0.2);
    }

    .activity-label {
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--muted, #6C757D);
      display: block;
      margin-bottom: 4px;
    }

    .activity-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text, #2C3E50);
      display: block;
    }

    .next-action {
      background: rgba(95, 169, 164, 0.04);
      border: 1px solid rgba(95, 169, 164, 0.12);
      padding: 12px 14px;
      border-radius: 8px;
      font-size: 13px;
      color: var(--text, #2C3E50);
      display: flex;
      align-items: center;
      gap: 8px;
      text-align: left;
    }

    :root.theme-dark .next-action {
      background: rgba(95, 169, 164, 0.08);
      border-color: rgba(95, 169, 164, 0.2);
    }

    .info-icon {
      color: #5FA9A4;
      flex-shrink: 0;
    }

    .next-action-text {
      font-weight: 500;
      line-height: 1.4;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn-primary, .btn-secondary {
      padding: 12px 24px;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      font-family: 'Montserrat', sans-serif;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 100px;
      position: relative;
      overflow: hidden;
    }

    .btn-primary {
      background: #5FA9A4;
      color: #FFFFFF;
      box-shadow: 0 4px 16px rgba(95, 169, 164, 0.3);
    }

    .btn-primary:hover {
      background: #4D8B87;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(95, 169, 164, 0.4);
    }

    .btn-primary:active {
      transform: translateY(0);
      box-shadow: 0 2px 8px rgba(95, 169, 164, 0.3);
    }

    .btn-secondary {
      background: transparent;
      color: var(--muted, #6C757D);
      border: 1.5px solid var(--border, #DEE2E6);
    }

    .btn-secondary:hover {
      background: var(--bg, #F8F9FA);
      border-color: var(--muted, #6C757D);
      color: var(--text, #2C3E50);
    }

    :root.theme-dark .btn-secondary {
      border-color: var(--border, #1F2937);
      color: var(--muted, #9CA3AF);
    }

    :root.theme-dark .btn-secondary:hover {
      background: var(--border, #1F2937);
      border-color: var(--muted, #9CA3AF);
      color: var(--text, #E5E7EB);
    }

    /* Animations */
    @keyframes logoEntrance {
      0% { 
        opacity: 0;
        transform: scale(0.5) translateY(-20px);
      }
      60% { 
        transform: scale(1.1) translateY(0);
      }
      100% { 
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    /* Mobile optimizations */
    @media (max-width: 480px) {
      .notification-modal {
        padding: 20px 16px 16px;
        margin: 12px;
        border-radius: 14px;
        max-width: 340px;
      }

      .logo {
        width: 44px;
        height: 44px;
      }

      .modal-title {
        font-size: 18px;
      }

      .modal-message {
        font-size: 14px;
      }

      .btn-primary, .btn-secondary {
        padding: 11px 20px;
        font-size: 14px;
        min-width: 90px;
        border-radius: 8px;
      }

      .activity-info, .next-action {
        padding: 10px 12px;
        border-radius: 8px;
      }

      .activity-name {
        font-size: 13px;
      }

      .next-action {
        font-size: 12px;
      }
    }

    /* Success state for session complete */
    .notification-modal[data-type="session-complete"] {
      border-top: 4px solid #22C55E;
    }

    .notification-modal[data-type="session-complete"] .logo {
      filter: drop-shadow(0 4px 12px rgba(34, 197, 94, 0.3));
    }

    /* Info state for phase complete */
    .notification-modal[data-type="phase-complete"] {
      border-top: 4px solid #5FA9A4;
    }

    .notification-modal[data-type="phase-complete"] .logo {
      filter: drop-shadow(0 4px 12px rgba(95, 169, 164, 0.3));
    }

    /* Backdrop blur effect */
    .notification-modal::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(95, 169, 164, 0.02) 0%, rgba(95, 169, 164, 0.05) 100%);
      pointer-events: none;
      z-index: -1;
    }
  `]
})
export class NotificationModalComponent {
  private dialogRef = inject(MatDialogRef<NotificationModalComponent>);
  protected data = inject<NotificationModalData>(MAT_DIALOG_DATA);

  protected getButtonText(): string {
    switch (this.data.type) {
      case 'session-complete':
        return 'Awesome!';
      case 'phase-complete':
        return 'Continue';
      default:
        return 'OK';
    }
  }

  protected onOkay(): void {
    this.dialogRef.close('okay');
  }

  protected onDismiss(): void {
    this.dialogRef.close('dismiss');
  }
}