import { Injectable, signal, computed, inject } from '@angular/core';
import { Badge, BadgeService } from './badge.service';
import { Logger } from './logger.service';

export interface BadgeNotification {
  id: string;
  badge: Badge;
  isRead: boolean;
  createdAt: Date;
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

@Injectable({ providedIn: 'root' })
export class BadgeNotificationService {
  private badgeService = inject(BadgeService);

  // Store notifications in signal
  private notificationsSignal = signal<BadgeNotification[]>([]);
  private lastCheckedBadgesSignal = signal<number[]>([]);
  private isDropdownOpenSignal = signal(false);

  // Public readonly signals
  readonly notifications = this.notificationsSignal.asReadonly();
  readonly isDropdownOpen = this.isDropdownOpenSignal.asReadonly();

  readonly unreadCount = computed(() => {
    return this.notificationsSignal().filter(n => !n.isRead).length;
  });

  constructor() {
    this.loadFromStorage();
  }

  // Check for new badges and create notifications
  checkForNewBadges(): void {
    this.badgeService.getUserBadges().subscribe({
      next: (badges) => {
        const lastChecked = this.lastCheckedBadgesSignal();
        const newBadges = badges.filter(b => !lastChecked.includes(b.id));

        if (newBadges.length > 0) {
          const newNotifications: BadgeNotification[] = newBadges.map(badge => ({
            id: `badge-${badge.id}-${Date.now()}`,
            badge,
            isRead: false,
            createdAt: new Date()
          }));

          this.notificationsSignal.update(current => [...newNotifications, ...current]);
          this.lastCheckedBadgesSignal.set(badges.map(b => b.id));
          this.saveToStorage();
        }
      },
      error: (_err) => {
        // Failed to check badges - silently handle
      }
    });
  }

  // Toggle dropdown
  toggleDropdown(): void {
    this.isDropdownOpenSignal.update(v => !v);
  }

  closeDropdown(): void {
    this.isDropdownOpenSignal.set(false);
  }

  // Mark notification as read
  markAsRead(notificationId: string): void {
    this.notificationsSignal.update(notifications =>
      notifications.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
    this.saveToStorage();
  }

  // Mark all as read
  markAllAsRead(): void {
    this.notificationsSignal.update(notifications =>
      notifications.map(n => ({ ...n, isRead: true }))
    );
    this.saveToStorage();
  }

  // Clear all notifications
  clearAll(): void {
    this.notificationsSignal.set([]);
    this.saveToStorage();
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

  // Persistence
  private saveToStorage(): void {
    try {
      localStorage.setItem('badge_notifications', JSON.stringify(this.notificationsSignal()));
      localStorage.setItem('last_checked_badges', JSON.stringify(this.lastCheckedBadgesSignal()));
    } catch (e) {
      Logger.warn('Could not save notifications to storage:', e);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('badge_notifications');
      const lastChecked = localStorage.getItem('last_checked_badges');

      if (stored) {
        const parsed = JSON.parse(stored);
        this.notificationsSignal.set(parsed.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt)
        })));
      }

      if (lastChecked) {
        this.lastCheckedBadgesSignal.set(JSON.parse(lastChecked));
      }
    } catch (e) {
      Logger.warn('Could not load notifications from storage:', e);
    }
  }
}
