import { Component, inject, HostListener, ElementRef, Input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { BadgeNotificationService, BadgeNotification } from '../../../core/services/badge-notification.service';
import { BadgeAchievementDialogComponent } from '../badge-achievement-dialog/badge-achievement-dialog.component';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-bell-container" [class.hidden]="isModalOpen">
      <button 
        class="notification-bell-btn" 
        (click)="toggleDropdown($event)"
        [class.has-notifications]="unreadCount() > 0"
        [disabled]="isModalOpen"
        [class.disabled]="isModalOpen"
        aria-label="Notifications">
        <i class="fa-solid fa-bell"></i>
        @if (unreadCount() > 0) {
          <span class="notification-badge">{{ unreadCount() > 99 ? '99+' : unreadCount() }}</span>
        }
      </button>

      @if (isDropdownOpen() && !isModalOpen) {
        <!-- Mobile backdrop -->
        <div class="mobile-backdrop" (click)="closeDropdown()"></div>
        
        <div class="notification-dropdown" (click)="$event.stopPropagation()">
          <div class="dropdown-header">
            <div class="header-title">
              <i class="fa-solid fa-trophy"></i>
              <h3>Achievements</h3>
            </div>
            <div class="header-actions">
              @if (notifications().length > 0) {
                <button class="mark-all-btn" (click)="markAllAsRead()">
                  <i class="fa-solid fa-check-double"></i>
                  <span class="mark-text">Mark all read</span>
                </button>
              }
              <button class="close-dropdown-btn" (click)="closeDropdown()" aria-label="Close">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          <div class="dropdown-content">
            @if (notifications().length === 0) {
              <div class="empty-state">
                <div class="empty-icon">
                  <i class="fa-solid fa-medal"></i>
                </div>
                <p class="empty-title">No achievements yet</p>
                <p class="empty-subtitle">Keep using Pomodify to earn badges!</p>
              </div>
            } @else {
              @for (notification of notifications(); track notification.id) {
                <button 
                  class="notification-item" 
                  [class.unread]="!notification.isRead"
                  (click)="openBadgeDialog(notification)">
                  <div class="notification-badge-img">
                    <img [src]="getBadgeImage(notification.badge.milestoneDays)" [alt]="notification.badge.name" />
                  </div>
                  <div class="notification-content">
                    <div class="notification-header">
                      <span class="badge-name">{{ getBadgeName(notification.badge.milestoneDays) }}</span>
                      @if (!notification.isRead) {
                        <span class="new-tag">NEW</span>
                      }
                    </div>
                    <p class="notification-desc">{{ notification.badge.milestoneDays }}-day streak achieved!</p>
                    <div class="notification-meta">
                      <i class="fa-regular fa-clock"></i>
                      <span>{{ getRelativeTime(notification.createdAt) }}</span>
                    </div>
                  </div>
                  <div class="notification-arrow">
                    <i class="fa-solid fa-chevron-right"></i>
                  </div>
                </button>
              }
            }
          </div>

          @if (notifications().length > 0) {
            <div class="dropdown-footer">
              <button class="clear-all-btn" (click)="clearAll()">
                <i class="fa-regular fa-trash-can"></i>
                Clear all
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['./notification-bell.component.scss']
})
export class NotificationBellComponent {
  @Input() isModalOpen = false;
  
  private dialog = inject(MatDialog);
  private elementRef = inject(ElementRef);
  private badgeNotificationService = inject(BadgeNotificationService);

  notifications = this.badgeNotificationService.notifications;
  unreadCount = this.badgeNotificationService.unreadCount;
  isDropdownOpen = this.badgeNotificationService.isDropdownOpen;

  constructor() {
    // Close dropdown when modal opens
    effect(() => {
      if (this.isModalOpen) {
        this.badgeNotificationService.closeDropdown();
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.badgeNotificationService.closeDropdown();
    }
  }

  toggleDropdown(event: Event): void {
    if (this.isModalOpen) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    event.stopPropagation();
    this.badgeNotificationService.toggleDropdown();
  }

  openBadgeDialog(notification: BadgeNotification): void {
    this.badgeNotificationService.markAsRead(notification.id);
    this.badgeNotificationService.closeDropdown();

    this.dialog.open(BadgeAchievementDialogComponent, {
      data: { badge: notification.badge },
      panelClass: 'badge-achievement-dialog',
      maxWidth: '95vw',
      disableClose: false
    });
  }

  markAllAsRead(): void {
    this.badgeNotificationService.markAllAsRead();
  }

  clearAll(): void {
    this.badgeNotificationService.clearAll();
  }

  closeDropdown(): void {
    this.badgeNotificationService.closeDropdown();
  }

  getBadgeImage(milestoneDays: number): string {
    return this.badgeNotificationService.getBadgeImage(milestoneDays);
  }

  getBadgeName(milestoneDays: number): string {
    return this.badgeNotificationService.getBadgeInfo(milestoneDays).badgeName;
  }

  getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  }
}
