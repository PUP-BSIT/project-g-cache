import { CommonModule } from '@angular/common';
import { Component, computed, signal, HostListener, inject, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { filter, switchMap, map } from 'rxjs/operators';
import { toggleTheme } from '../../shared/theme';
import { API } from '../../core/config/api.config';
import {
  CreateActivityModal,
  ActivityData as CreateActivityModalData,
} from '../../shared/components/create-activity-modal/create-activity-modal';
import { Profile, ProfileData } from '../profile/profile';
import { Auth } from '../../core/services/auth';
import { DashboardService, DashboardMetrics, RecentSession } from '../../core/services/dashboard.service';
import { SmartActionComponent, SmartActionMode } from '../../shared/components/smart-action/smart-action.component';
import { SmartActionWizardComponent } from './smart-action-wizard';
import { ActivityService } from '../../core/services/activity.service';
import { SuccessNotificationService } from '../../core/services/success-notification.service';

export type Session = {
  id: string;
  focusTimeMinutes: number;
  breakTimeMinutes: number;
  note?: string;
  createdAt: string;
};

type Activity = {
  id: string;
  name: string;
  icon: string;
  category: string;
  colorTag: string;
  estimatedHoursPerWeek: number;
  lastAccessed: string;
  sessions: Session[];
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SmartActionComponent,
    SmartActionWizardComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard implements OnInit {
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private http = inject(HttpClient);
  private auth = inject(Auth);
  private dashboardService = inject(DashboardService);
  private activityService = inject(ActivityService);
  private notificationService = inject(SuccessNotificationService);

  protected sidebarExpanded = signal(true);
  protected isLoggingOut = signal(false);
  protected profile = signal<any>(null);

  protected dashboardMetrics = signal<DashboardMetrics | null>(null);
  protected isLoadingDashboard = signal(false);
  protected dashboardError = signal<string | null>(null);
  protected isResendingEmail = signal(false);

  smartActionWizardOpen = false;
  smartActionMode: SmartActionMode = null;

  protected toggleSidebar(): void {
    this.sidebarExpanded.update((expanded: boolean) => !expanded);
  }

  protected onToggleTheme(): void {
    toggleTheme();
  }

  ngOnInit(): void {
    // Auto-collapse sidebar on mobile
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      this.sidebarExpanded.set(false);
    }
    this.loadDashboardMetrics();
    this.auth.fetchAndStoreUserProfile().then(user => {
        this.profile.set(user);
    }).catch(err => console.error('Failed to fetch profile', err));
  }

  protected onResendVerification(): void {
      const email = this.profile()?.email;
      if (!email) return;
      
      this.isResendingEmail.set(true);
      this.auth.resendVerification(email).then(() => {
          this.notificationService.showSuccess('Email Sent', 'Verification email sent successfully.');
      }).catch(() => {
          this.notificationService.showError('Error', 'Failed to send verification email.');
      }).finally(() => {
          this.isResendingEmail.set(false);
      });
  }

  private loadDashboardMetrics(): void {
    this.isLoadingDashboard.set(true);
    this.dashboardError.set(null);

    const timezone = this.dashboardService.getUserTimezone();
    console.log('[Dashboard] Loading dashboard metrics with timezone:', timezone);

    this.dashboardService.getDashboard(timezone).subscribe({
      next: (data) => {
        console.log('[Dashboard] Metrics loaded successfully:', {
          sessions: data.totalSessions,
          focusTime: data.focusHoursAllTime,
          recentSessionsCount: data.recentSessions?.length || 0,
          recentSessions: data.recentSessions
        });
        this.dashboardMetrics.set(data);
        this.isLoadingDashboard.set(false);
      },
      error: (err) => {
        console.error('[Dashboard] Metrics loading error:', err);
        const errorMsg = err?.error?.message || err?.message || 'Failed to load dashboard metrics';
        this.dashboardError.set(`${errorMsg}. Please refresh the page or try logging in again.`);
        this.isLoadingDashboard.set(false);
      }
    });
  }

  protected readonly currentStreak = computed(() => {
    return this.dashboardMetrics()?.currentStreak || 0;
  });

  protected readonly bestStreak = computed(() => {
    return this.dashboardMetrics()?.bestStreak || 0;
  });

  protected readonly totalActivities = computed(() => {
    return this.dashboardMetrics()?.totalActivities || 0;
  });

  protected readonly totalCompletedSessions = computed(() => {
    return this.dashboardMetrics()?.totalSessions || 0;
  });

  protected readonly totalFocusTimeHours = computed(() => {
    const hours = this.dashboardMetrics()?.focusHoursAllTime || 0;
    return hours.toFixed(1);
  });

  protected readonly focusHoursToday = computed(() => {
    const hours = this.dashboardMetrics()?.focusHoursToday || 0;
    return hours.toFixed(1);
  });

  protected readonly focusHoursThisWeek = computed(() => {
    const hours = this.dashboardMetrics()?.focusHoursThisWeek || 0;
    return hours.toFixed(1);
  });

  protected readonly recentActivities = computed(() => {
    const sessions = this.dashboardMetrics()?.recentSessions || [];
    // Show up to 5 most recent sessions for dashboard display
    return sessions.slice(0, 5);
  });

  protected openCreateActivityModal(): void {
    console.log('[Dashboard] Quick start - creating new activity and session');
    this.dialog
      .open(CreateActivityModal)
      .afterClosed()
      .pipe(
        filter((result: CreateActivityModalData) => !!result),
        switchMap((result: CreateActivityModalData) => {
          console.log('[Dashboard] Creating new activity:', result.name);
          const req: any = {
            title: result.name,
            description: result.category || '',
          };
          console.log('[Dashboard] Request payload:', JSON.stringify(req, null, 2));
          
          // Create activity via HTTP client
          return this.http.post<any>(API.ACTIVITIES.CREATE, req).pipe(
            map(created => ({ created, activityTitle: result.name }))
          );
        }),
        switchMap(({ created, activityTitle }) => {
          console.log('[Dashboard] Activity created, auto-creating session');
          const activityId = created.activities?.[0]?.activityId;
          console.log('[Dashboard] Activity ID:', activityId);
          console.log('[Dashboard] Created object:', created);
          
          // Auto-create session with CLASSIC preset
          const sessionPayload = {
            sessionType: 'CLASSIC',
            focusTimeInMinutes: 25,
            breakTimeInMinutes: 5,
            cycles: 6
          };
          
          console.log('[Dashboard] Session URL:', API.ACTIVITIES.SESSIONS.CREATE(activityId));
          console.log('[Dashboard] Session payload:', sessionPayload);
          
          return this.http.post<any>(API.ACTIVITIES.SESSIONS.CREATE(activityId), sessionPayload).pipe(
            map(response => ({ response, activityId, activityTitle }))
          );
        })
      )
      .subscribe({
        next: ({ response, activityId, activityTitle }) => {
          console.log('[Dashboard] Session created, navigating to timer');
          console.log('[Dashboard] Session response:', response);
          
          // Backend returns { message, sessions: [SessionItem], ... }
          const sessionId = response.sessions?.[0]?.id;
          console.log('[Dashboard] Extracted sessionId:', sessionId);
          console.log('[Dashboard] Navigation params:', { activityTitle, sessionId });
          
          if (!sessionId) {
            console.error('[Dashboard] Session ID is undefined!');
            console.error('[Dashboard] Response structure:', JSON.stringify(response, null, 2));
            return;
          }
          
          // Navigate to: /activities/:activityTitle/sessions/:sessionId
          this.router.navigate(['/activities', activityTitle, 'sessions', sessionId]);
        },
        error: (err) => {
          console.error('[Dashboard] Error in create flow:', err);
          console.error('[Dashboard] Error status:', err.status);
          console.error('[Dashboard] Error body:', err.error);
          
          let errorMsg = err?.error?.message || err?.message || 'Failed to create activity/session';
          
          // Check if it's a backend cache configuration error
          if (errorMsg.includes('Cannot find cache')) {
            errorMsg = 'Backend cache not configured. Activities cannot be created until the backend cache is properly set up. Please contact your administrator to configure Spring Boot cache.';
            console.error('[Dashboard] Backend cache error: Spring Boot cache named "activities" is not configured.');
          }
          
          alert(`Error: ${errorMsg}`);
        }
      });
  }

  protected onLogout(): void {
    console.log('[Dashboard] Logout initiated');
    this.isLoggingOut.set(true);
    this.auth.logout()
      .then(() => {
        console.log('[Dashboard] Logout completed');
      })
      .catch((error) => {
        console.error('[Dashboard] Logout error:', error);
        // Error is already handled in auth service
      })
      .finally(() => {
        this.isLoggingOut.set(false);
      });
  }

  protected openProfileModal(): void {
    this.dialog
      .open(Profile, {
        width: '550px',
        maxWidth: '90vw',
        panelClass: 'profile-dialog',
      })
      .afterClosed()
      .subscribe((result: ProfileData) => {
        if (result) {
          console.log('Profile updated:', result);
        }
      });
  }

  protected getRelativeTime(timestamp: string): string {
    // Robust ISO string parsing, fallback to UTC if no timezone
    let date: Date;
    if (!timestamp) return '';
    // Try to parse ISO string, fallback to Date constructor
    try {
      // If timestamp is already a Date object, use it
      if (typeof timestamp !== 'string') {
        date = new Date(timestamp);
      } else if (timestamp.endsWith('Z') || timestamp.includes('+')) {
        date = new Date(timestamp);
      } else {
        // Assume local time if no timezone info
        date = new Date(timestamp.replace(' ', 'T'));
      }
    } catch {
      date = new Date(timestamp);
    }
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  }

  protected navigateToSession(session: RecentSession): void {
    // Navigate to: /activities/:activityName/sessions/:sessionId
    this.router.navigate(['/activities', session.activityName, 'sessions', session.id]);
  }

  onSmartActionSelected(mode: SmartActionMode) {
    this.smartActionMode = mode;
    if (mode === 'wizard') {
      this.smartActionWizardOpen = true;
    } else if (mode === 'quick') {
      this.startQuickFocus();
    } else if (mode === 'custom') {
      this.openCreateActivityModal();
    }
  }

  onSmartActionWizardClosed() {
    this.smartActionWizardOpen = false;
    this.smartActionMode = null;
  }

  onSmartActionWizardConfirmed({ activityId, sessionId }: { activityId: number, sessionId: number }) {
    this.smartActionWizardOpen = false;
    this.smartActionMode = null;
    // Fetch activity details to get the title for navigation
    this.activityService.getActivity(activityId).subscribe({
      next: (act) => {
        if (act && act.activityTitle) {
          this.router.navigate(['/activities', act.activityTitle, 'sessions', sessionId]);
        } else {
          // As a last resort, navigate by ID (may not match route config)
          this.router.navigate(['/activities', activityId, 'sessions', sessionId]);
        }
      },
      error: () => {
        this.router.navigate(['/activities', activityId, 'sessions', sessionId]);
      }
    });
  }

  startQuickFocus() {
    this.http.post<any>(API.AI.QUICK_FOCUS, {}).subscribe({
      next: (res) => {
        this.router.navigate(['/activities', res.activityId, 'sessions', res.sessionId]);
      },
      error: (err) => {
        alert('Failed to start Quick Focus.');
      }
    });
  }
}

function cryptoRandomId(): string {
  try {
    // Use Web Crypto if available
    const arr = new Uint32Array(1);
    (window.crypto || (window as any).msCrypto).getRandomValues(arr);
    return String(arr[0]);
  } catch {
    return String(Date.now());
  }
}

