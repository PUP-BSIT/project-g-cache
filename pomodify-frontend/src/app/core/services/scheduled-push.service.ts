import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { API } from '../config/api.config';

export interface SchedulePushRequest {
  sessionId: number;
  activityId: number;
  title: string;
  body: string;
  delaySeconds: number;
  notificationType: 'PHASE_COMPLETE' | 'SESSION_COMPLETE';
  currentPhase: 'FOCUS' | 'BREAK';
}

export interface SchedulePushResponse {
  id: number;
  scheduledAt: string;
  message: string;
}

/**
 * Service for scheduling server-side push notifications.
 * This enables true mobile push notifications even when the browser is closed.
 */
@Injectable({
  providedIn: 'root'
})
export class ScheduledPushService {
  private http = inject(HttpClient);

  /**
   * Schedule a push notification to be sent when the timer completes.
   * The server will send the notification at the scheduled time,
   * even if the browser is closed.
   */
  scheduleNotification(request: SchedulePushRequest): Observable<SchedulePushResponse | null> {
    console.log('📅 Scheduling server-side push notification:', {
      sessionId: request.sessionId,
      delaySeconds: request.delaySeconds,
      phase: request.currentPhase
    });

    return this.http.post<SchedulePushResponse>(API.PUSH.SCHEDULE, request).pipe(
      catchError(error => {
        console.warn('⚠️ Failed to schedule push notification:', error);
        // Don't fail silently - return null so caller knows it failed
        return of(null);
      })
    );
  }

  /**
   * Cancel scheduled notifications for a specific session.
   * Call this when user pauses, stops, or manually completes a phase.
   */
  cancelSessionNotifications(sessionId: number): Observable<any> {
    console.log('🚫 Cancelling scheduled notifications for session:', sessionId);

    return this.http.delete(API.PUSH.CANCEL_SCHEDULE(sessionId)).pipe(
      catchError(error => {
        console.warn('⚠️ Failed to cancel scheduled notifications:', error);
        return of(null);
      })
    );
  }

  /**
   * Cancel all scheduled notifications for the current user.
   */
  cancelAllNotifications(): Observable<any> {
    console.log('🚫 Cancelling all scheduled notifications');

    return this.http.delete(API.PUSH.CANCEL_ALL_SCHEDULES).pipe(
      catchError(error => {
        console.warn('⚠️ Failed to cancel all scheduled notifications:', error);
        return of(null);
      })
    );
  }

  /**
   * Helper to calculate notification content based on phase
   */
  getNotificationContent(
    currentPhase: 'FOCUS' | 'BREAK',
    activityTitle: string
  ): { title: string; body: string } {
    if (currentPhase === 'FOCUS') {
      return {
        title: 'Focus Phase Complete! 🎯',
        body: `Time for a break from "${activityTitle}". Step away and recharge!`
      };
    } else {
      return {
        title: 'Break Phase Complete! ⏰',
        body: `Break time is over. Ready to focus on "${activityTitle}" again?`
      };
    }
  }
}
