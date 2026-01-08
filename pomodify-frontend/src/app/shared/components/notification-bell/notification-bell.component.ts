import { Component, inject, HostListener, ElementRef, Input, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { BadgeNotificationService, BadgeNotification } from '../../../core/services/badge-notification.service';
import { BadgeAchievementDialogComponent } from '../badge-achievement-dialog/badge-achievement-dialog.component';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-bell-container">
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
              <button class="close-dropdown-btn" (click)="closeDropdown()" aria-label="Close">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          <div class="dropdown-content">
            @if (isLoading()) {
              <div class="empty-state">
                <div class="empty-icon">
                  <i class="fa-solid fa-spinner fa-spin"></i>
                </div>
                <p class="empty-title">Loading achievements...</p>
              </div>
            } @else if (notifications().length === 0) {
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
                  [class.unread]="notification.isNew"
                  (click)="openBadgeDialog(notification)">
                  <div class="notification-badge-img">
                    <img [src]="getBadgeImage(notification.badge.milestoneDays)" [alt]="notification.badge.name" />
                  </div>
                  <div class="notification-content">
                    <div class="notification-header">
                      <span class="badge-name">{{ getBadgeName(notification.badge.milestoneDays) }}</span>
                      @if (notification.isNew) {
                        <span class="new-tag">NEW</span>
                      }
                    </div>
                    <p class="notification-desc">{{ notification.badge.milestoneDays }}-day streak achieved!</p>
                    <div class="notification-meta">
                      <i class="fa-regular fa-calendar"></i>
                      <span>{{ getFormattedDate(notification.badge.dateAwarded) }}</span>
                    </div>
                  </div>
                  <div class="notification-arrow">
                    <i class="fa-solid fa-chevron-right"></i>
                  </div>
                </button>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./notification-bell.component.scss']
})
export class NotificationBellComponent implements OnInit {
  @Input() isModalOpen = false;
  
  private dialog = inject(MatDialog);
  private elementRef = inject(ElementRef);
  private badgeNotificationService = inject(BadgeNotificationService);

  notifications = this.badgeNotificationService.notifications;
  unreadCount = this.badgeNotificationService.unreadCount;
  isDropdownOpen = this.badgeNotificationService.isDropdownOpen;
  isLoading = this.badgeNotificationService.isLoading;

  constructor() {
    // Close dropdown when modal opens
    effect(() => {
      if (this.isModalOpen) {
        this.badgeNotificationService.closeDropdown();
      }
    });
  }

  ngOnInit(): void {
    // Load badge notifications from backend on component init
    this.badgeNotificationService.loadBadgeNotifications();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.badgeNotificationService.closeDropdown();
    }
  }

  @HostListener('click', ['$event'])
  @HostListener('mousedown', ['$event'])
  @HostListener('touchstart', ['$event'])
  onButtonClick(event: Event): void {
    if (this.isModalOpen) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return;
    }
  }

  toggleDropdown(event: Event): void {
    if (this.isModalOpen) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    event.stopPropagation();
    // Refresh badges when opening dropdown
    this.badgeNotificationService.loadBadgeNotifications();
    this.badgeNotificationService.toggleDropdown();
  }

  openBadgeDialog(notification: BadgeNotification): void {
    this.badgeNotificationService.closeDropdown();

    this.dialog.open(BadgeAchievementDialogComponent, {
      data: { badge: notification.badge },
      panelClass: 'badge-achievement-dialog',
      maxWidth: '95vw',
      disableClose: false
    });
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

  getFormattedDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
}
