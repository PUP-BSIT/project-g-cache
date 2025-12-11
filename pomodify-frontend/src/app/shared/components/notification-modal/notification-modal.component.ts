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
      <!-- Header -->
      <div class="modal-header">
        <div class="icon-container">
          @if (data.type === 'session-complete') {
            <div class="icon session-complete">🎉</div>
          } @else {
            <div class="icon phase-complete">⏰</div>
          }
        </div>
        <h2 class="modal-title">{{ data.title }}</h2>
      </div>

      <!-- Body -->
      <div class="modal-body">
        <p class="modal-message">{{ data.body }}</p>
        
        @if (data.activityTitle) {
          <div class="activity-info">
            <span class="activity-label">Activity:</span>
            <span class="activity-name">{{ data.activityTitle }}</span>
          </div>
        }

        @if (data.nextAction) {
          <div class="next-action">
            <span class="next-action-text">{{ data.nextAction }}</span>
          </div>
        }
      </div>

      <!-- Actions -->
      <div class="modal-actions">
        <button 
          class="btn-primary" 
          (click)="onOkay()"
          [class.pulse]="true">
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
      padding: 24px;
      text-align: center;
      max-width: 400px;
      border-radius: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    }

    .modal-header {
      margin-bottom: 20px;
    }

    .icon-container {
      margin-bottom: 16px;
    }

    .icon {
      font-size: 48px;
      display: inline-block;
      animation: bounce 1s ease-in-out;
    }

    .modal-title {
      font-size: 24px;
      font-weight: 600;
      margin: 0;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }

    .modal-body {
      margin-bottom: 24px;
    }

    .modal-message {
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 16px;
      opacity: 0.9;
    }

    .activity-info {
      background: rgba(255,255,255,0.1);
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .activity-label {
      font-size: 14px;
      opacity: 0.8;
      display: block;
      margin-bottom: 4px;
    }

    .activity-name {
      font-size: 16px;
      font-weight: 600;
    }

    .next-action {
      background: rgba(255,255,255,0.15);
      padding: 10px;
      border-radius: 6px;
      font-size: 14px;
      font-style: italic;
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
      border-radius: 25px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      min-width: 120px;
    }

    .btn-primary {
      background: #fff;
      color: #667eea;
      box-shadow: 0 4px 15px rgba(255,255,255,0.3);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255,255,255,0.4);
    }

    .btn-primary.pulse {
      animation: pulse 2s infinite;
    }

    .btn-secondary {
      background: transparent;
      color: white;
      border: 2px solid rgba(255,255,255,0.5);
    }

    .btn-secondary:hover {
      background: rgba(255,255,255,0.1);
      border-color: rgba(255,255,255,0.8);
    }

    /* Animations */
    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-10px); }
      60% { transform: translateY(-5px); }
    }

    @keyframes pulse {
      0% { box-shadow: 0 4px 15px rgba(255,255,255,0.3); }
      50% { box-shadow: 0 6px 25px rgba(255,255,255,0.6); }
      100% { box-shadow: 0 4px 15px rgba(255,255,255,0.3); }
    }

    /* Mobile optimizations */
    @media (max-width: 480px) {
      .notification-modal {
        padding: 20px;
        margin: 16px;
      }

      .modal-title {
        font-size: 20px;
      }

      .icon {
        font-size: 40px;
      }

      .btn-primary, .btn-secondary {
        padding: 14px 20px;
        font-size: 16px;
        min-width: 100px;
      }
    }

    /* Session complete styling */
    .notification-modal[data-type="session-complete"] {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    }

    .notification-modal[data-type="session-complete"] .btn-primary {
      color: #11998e;
    }

    /* Phase complete styling */
    .notification-modal[data-type="phase-complete"] {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .notification-modal[data-type="phase-complete"] .btn-primary {
      color: #667eea;
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