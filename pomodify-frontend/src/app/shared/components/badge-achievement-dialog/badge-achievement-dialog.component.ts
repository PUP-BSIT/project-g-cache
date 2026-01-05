import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Badge } from '../../../core/services/badge.service';
import { BadgeNotificationService } from '../../../core/services/badge-notification.service';

export interface BadgeAchievementDialogData {
  badge: Badge;
}

@Component({
  selector: 'app-badge-achievement-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="badge-dialog-wrapper">
      <!-- Background particles -->
      <div class="particles">
        @for (i of particles; track i) {
          <div class="particle" [style.--i]="i"></div>
        }
      </div>

      <!-- Floating stars -->
      <div class="floating-stars">
        @for (i of stars; track i) {
          <i class="fa-solid fa-star star" [style.--delay]="i * 0.3 + 's'" [style.--x]="getStarX(i)" [style.--y]="getStarY(i)"></i>
        }
      </div>

      <!-- Close button -->
      <button class="close-btn" (click)="close()" aria-label="Close">
        <i class="fa-solid fa-xmark"></i>
      </button>

      <!-- Mascot section at top -->
      <div class="mascot-hero">
        <div class="mascot-glow"></div>
        <img src="assets/images/pomodify-mascoot.png" alt="Pomodify Mascot" class="mascot-image" />
        <div class="mascot-sparkles">
          <i class="fa-solid fa-sparkles sparkle-1"></i>
          <i class="fa-solid fa-sparkles sparkle-2"></i>
          <i class="fa-solid fa-star sparkle-3"></i>
        </div>
      </div>

      <!-- Ribbon with days -->
      <div class="ribbon">
        <img [src]="getBadgeImage()" [alt]="badgeInfo.badgeName" class="ribbon-badge-img" />
        <span>{{ data.badge.milestoneDays }} DAYS</span>
      </div>

      <!-- Main content -->
      <div class="content-section">
        <h1 class="title">Congratulations!</h1>
        
        <div class="badge-name-tag">
          <img [src]="getBadgeImage()" [alt]="badgeInfo.badgeName" class="badge-tag-img" />
          <span>{{ badgeInfo.badgeName }}</span>
        </div>

        <!-- Speech bubble -->
        <div class="speech-box">
          <p>{{ badgeInfo.mascotText }}</p>
        </div>

        <div class="date-earned">
          <i class="fa-regular fa-calendar-check"></i>
          <span>Earned on {{ formatDate(data.badge.dateAwarded) }}</span>
        </div>
      </div>

      <!-- Action button -->
      <button class="action-btn" (click)="close()">
        <i class="fa-solid fa-rocket"></i>
        <span>Keep Going!</span>
      </button>
    </div>
  `,
  styleUrls: ['./badge-achievement-dialog.component.scss']
})
export class BadgeAchievementDialogComponent implements OnInit, OnDestroy {
  private dialogRef = inject(MatDialogRef<BadgeAchievementDialogComponent>);
  private badgeNotificationService = inject(BadgeNotificationService);
  data = inject<BadgeAchievementDialogData>(MAT_DIALOG_DATA);

  particles = Array.from({ length: 30 }, (_, i) => i);
  stars = Array.from({ length: 8 }, (_, i) => i);
  badgeInfo: { title: string; badgeName: string; message: string; mascotText: string };
  private audioElement: HTMLAudioElement | null = null;

  constructor() {
    this.badgeInfo = this.badgeNotificationService.getBadgeInfo(this.data.badge.milestoneDays);
  }

  ngOnInit(): void {
    // Play the badge sound and store reference
    this.audioElement = this.badgeNotificationService.playBadgeSound(this.data.badge.milestoneDays);
  }

  ngOnDestroy(): void {
    this.stopSound();
  }

  close(): void {
    this.stopSound();
    this.dialogRef.close();
  }

  private stopSound(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement = null;
    }
  }

  getBadgeImage(): string {
    return this.badgeNotificationService.getBadgeImage(this.data.badge.milestoneDays);
  }

  getStarX(index: number): string {
    const positions = [10, 85, 15, 90, 5, 80, 20, 75];
    return positions[index % positions.length] + '%';
  }

  getStarY(index: number): string {
    const positions = [15, 20, 45, 50, 70, 75, 30, 60];
    return positions[index % positions.length] + '%';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
