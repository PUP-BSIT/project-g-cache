import { Injectable, signal, computed, inject } from '@angular/core';
import { Badge, BadgeService } from './badge.service';
import { Logger } from './logger.service';

export interface BadgeNotification {
  id: number;
  badge: Badge;
  isNew: boolean; // Based on dateAwarded being recent (e.g., within last 7 days)
}

// Badge milestone to sound file mapping
const BADGE_SOUNDS: Record<number, string> = {
  3: 'assets/sounds/3-day.mp3',
  7: 'assets/sounds/7-days.mp3',
  14: 'assets/sounds/14-days.mp3',
  30: 'assets/sounds/30-days.mp3',
  100: 'assets/sounds/100-days.mp3',
  365: 'assets/sounds/365-days.mp3',
};

// Badge milestone to image file mapping
const BADGE_IMAGES: Record<number, string> = {
  3: 'assets/images/badges/the-bookmark.png',
  7: 'assets/images/badges/deep-work.png',
  14: 'assets/images/badges/the-protégé.png',
  30: 'assets/images/badges/the-curator.png',
  100: 'assets/images/badges/the-scholar.png',
  365: 'assets/images/badges/the-alchemist.png',
};

// Badge milestone to congratulatory message mapping
const BADGE_MESSAGES: Record<number, { title: string; badgeName: string; message: string; mascotText: string }> = {
  3: {
    title: '🎉 Congratulations!',
    badgeName: 'The Bookmark Badge',
    message: 'A symbol of commitment and the first chapter of your productivity journey.',
    mascotText: 'You\'ve earned the Bookmark Badge, a symbol of commitment and the first chapter of your productivity journey. Keep turning the pages this is just the beginning.'
  },
  7: {
    title: '🔥 Congratulations!',
    badgeName: 'The Deep Work Badge',
    message: 'One full week of focus well done! You\'ve gone beyond starting and entered the rhythm of deep work.',
    mascotText: 'You\'ve unlocked the Deep Work Badge, awarded for reaching a full week of intentional focus. Stay in the flow you\'re building momentum. One full week of focus well done! You\'ve gone beyond starting and entered the rhythm of deep work.'
  },
  14: {
    title: '⭐ Congratulations!',
    badgeName: 'The Protégé Badge',
    message: 'Two weeks strong! You\'re no longer experimenting you\'re learning, adapting, and growing with purpose.',
    mascotText: 'You\'ve earned The Protégé Badge, recognizing your commitment to growth and consistency. Keep learning mastery starts here.'
  },
  30: {
    title: '🏆 Congratulations!',
    badgeName: 'The Curator Badge',
    message: 'Thirty days of focus is no small achievement. Your time is becoming a powerful tool.',
    mascotText: 'You\'ve been awarded The Curator Badge, honoring a full month of discipline and intentional productivity. Your time is becoming a powerful tool use it wisely.'
  },
  100: {
    title: '💎 Congratulations!',
    badgeName: 'The Scholar Badge',
    message: 'One hundred days. That\'s dedication, patience, and real mastery.',
    mascotText: 'You\'ve earned The Scholar Badge, reserved for those who commit to long-term growth. Your focus is sharp, your habits are strong, and your progress speaks for itself.'
  },
  365: {
    title: '👑 Congratulations!',
    badgeName: 'The Alchemist Badge',
    message: 'One full year of focused effort remarkable. You didn\'t just manage time; you mastered it.',
    mascotText: 'You have unlocked The Alchemist Badge, the highest honor. You\'ve mastered the art of turning time into value. This isn\'t just an achievement, it\'s a transformation.'
  },
};

// Number of days to consider a badge as "new"
const NEW_BADGE_THRESHOLD_DAYS = 7;

@Injectable({ providedIn: 'root' })
export class BadgeNotificationService {
  private badgeService = inject(BadgeService);

  // Store notifications in signal - fetched dynamically from backend
  private notificationsSignal = signal<BadgeNotification[]>([]);
  private isDropdownOpenSignal = signal(false);
  private isLoadingSignal = signal(false);

  // Public readonly signals
  readonly notifications = this.notificationsSignal.asReadonly();
  readonly isDropdownOpen = this.isDropdownOpenSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();

  // Count badges awarded in the last N days as "new"
  readonly unreadCount = computed(() => {
    return this.notificationsSignal().filter(n => n.isNew).length;
  });

  // Fetch badges from backend and convert to notifications
  loadBadgeNotifications(): void {
    this.isLoadingSignal.set(true);
    
    this.badgeService.getUserBadges().subscribe({
      next: (badges) => {
        const notifications: BadgeNotification[] = badges
          .sort((a, b) => new Date(b.dateAwarded).getTime() - new Date(a.dateAwarded).getTime())
          .map(badge => ({
            id: badge.id,
            badge,
            isNew: this.isBadgeNew(badge.dateAwarded)
          }));

        this.notificationsSignal.set(notifications);
        this.isLoadingSignal.set(false);
      },
      error: (_err) => {
        Logger.warn('Failed to load badge notifications');
        this.isLoadingSignal.set(false);
      }
    });
  }

  // Check if a badge was awarded recently
  private isBadgeNew(dateAwarded: string): boolean {
    const awardedDate = new Date(dateAwarded);
    const now = new Date();
    const diffTime = now.getTime() - awardedDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= NEW_BADGE_THRESHOLD_DAYS;
  }

  // Toggle dropdown
  toggleDropdown(): void {
    this.isDropdownOpenSignal.update(v => !v);
  }

  closeDropdown(): void {
    this.isDropdownOpenSignal.set(false);
  }

  // Get badge message info
  getBadgeInfo(milestoneDays: number): { title: string; badgeName: string; message: string; mascotText: string } {
    return BADGE_MESSAGES[milestoneDays] || {
      title: '🎖️ Congratulations!',
      badgeName: `${milestoneDays}-Day Badge`,
      message: `You've achieved a ${milestoneDays}-day streak! Amazing!`,
      mascotText: `You've earned the ${milestoneDays}-Day Badge! You're doing great!`
    };
  }

  // Get sound file for badge
  getBadgeSound(milestoneDays: number): string | null {
    return BADGE_SOUNDS[milestoneDays] || null;
  }

  // Get badge image for milestone
  getBadgeImage(milestoneDays: number): string {
    return BADGE_IMAGES[milestoneDays] || 'assets/images/badges/the-bookmark.png';
  }

  // Play badge sound and return audio element for control
  playBadgeSound(milestoneDays: number): HTMLAudioElement | null {
    const soundFile = this.getBadgeSound(milestoneDays);
    if (soundFile) {
      const audio = new Audio(soundFile);
      audio.volume = 0.7;
      audio.play().catch(err => Logger.warn('Could not play badge sound:', err));
      return audio;
    }
    return null;
  }
}
