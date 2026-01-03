import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FcmService } from './core/services/fcm.service';
import { NotificationService } from './core/services/notification.service';
import { NotificationTestService } from './core/services/notification-test.service';
import { Auth } from './core/services/auth';

@Component({
  selector: 'app-test-fcm',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px; max-width: 600px; margin: 0 auto;">
      <h2>🔔 FCM & Notification Testing</h2>
      
      <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px;">
        <h3>Current Status</h3>
        <p><strong>Tab Visible:</strong> {{ status.isTabVisible ? '✅ Yes' : '❌ No' }}</p>
        <p><strong>Notification Permission:</strong> {{ status.notificationPermission }}</p>
        <p><strong>Service Worker Supported:</strong> {{ status.serviceWorkerSupported ? '✅ Yes' : '❌ No' }}</p>
        <p><strong>Pending Notifications:</strong> {{ status.pendingNotifications }}</p>
      </div>

      <div style="margin: 20px 0;">
        <h3>Test Actions</h3>
        <button 
          (click)="initializeFCM()" 
          style="margin: 5px; padding: 10px 15px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Initialize FCM
        </button>
        
        <button 
          (click)="testSessionCompletion()" 
          style="margin: 5px; padding: 10px 15px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Test Session Completion
        </button>
        
        <button 
          (click)="testPhaseCompletion()" 
          style="margin: 5px; padding: 10px 15px; background: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Test Phase Completion
        </button>
        
        <button 
          (click)="refreshStatus()" 
          style="margin: 5px; padding: 10px 15px; background: #9C27B0; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Refresh Status
        </button>
      </div>

      <div style="margin: 20px 0; padding: 15px; background: #e3f2fd; border-radius: 8px;">
        <h3>📋 Testing Instructions</h3>
        <ol>
          <li><strong>Initialize FCM:</strong> Click "Initialize FCM" button</li>
          <li><strong>Grant Permission:</strong> Allow notifications when prompted</li>
          <li><strong>Test Closed Tab:</strong> Click "Test Session Completion", then switch to another tab or minimize browser</li>
          <li><strong>Check Results:</strong> You should see push notification and/or hear sound based on your settings</li>
          <li><strong>Return to Tab:</strong> Come back to see if pending notifications are handled</li>
        </ol>
      </div>

      <div style="margin: 20px 0; padding: 15px; background: #fff3e0; border-radius: 8px;">
        <h3>⚙️ Settings to Test</h3>
        <p>Go to Settings page and try different combinations:</p>
        <ul>
          <li><strong>Both enabled:</strong> Push notification + Sound</li>
          <li><strong>Only notifications:</strong> Push notification only</li>
          <li><strong>Only sound:</strong> Sound only</li>
          <li><strong>Both disabled:</strong> Nothing</li>
        </ul>
      </div>

      @if (logs.length > 0) {
        <div style="margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px;">
          <h3>📝 Logs</h3>
          <div style="font-family: monospace; font-size: 12px; max-height: 200px; overflow-y: auto;">
            @for (log of logs; track $index) {
              <div>{{ log }}</div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class TestFcmComponent {
  private fcmService = inject(FcmService);
  private notificationService = inject(NotificationService);
  private testService = inject(NotificationTestService);
  private authService = inject(Auth);

  status = this.testService.getNotificationStatus();
  logs: string[] = [];

  async initializeFCM() {
    this.addLog('🔔 Initializing FCM...');
    try {
      // Step 1: Check notification permission
      this.addLog('📱 Checking notification permission...');
      const permission = await Notification.requestPermission();
      this.addLog(`📱 Permission result: ${permission}`);
      
      if (permission !== 'granted') {
        this.addLog('❌ Notification permission denied. Please allow notifications in browser settings.');
        return;
      }
      
      // Step 2: Test manual notification
      this.addLog('🧪 Testing manual notification...');
      new Notification('FCM Test', {
        body: 'Testing notification system - this should appear!',
        icon: '/assets/images/logo.png'
      });
      this.addLog('✅ Manual notification sent');
      
      // Step 3: Initialize FCM service
      this.addLog('🔧 Initializing FCM service...');
        await this.fcmService.initializeFCM();
      this.addLog('✅ FCM service initialized successfully');
      
      this.refreshStatus();
    } catch (error) {
      this.addLog(`❌ FCM initialization failed: ${error}`);
      console.error('FCM Error:', error);
    }
  }

  async testSessionCompletion() {
    this.addLog('Testing session completion notification...');
    try {
      await this.testService.testDesktopClosedTabBehavior();
      this.addLog('✅ Session completion test triggered');
      this.addLog('💡 Switch to another tab or minimize browser to test closed tab behavior');
    } catch (error) {
      this.addLog(`❌ Test failed: ${error}`);
    }
  }

  async testPhaseCompletion() {
    this.addLog('Testing phase completion notification...');
    try {
      await this.testService.testPhaseCompletion();
      this.addLog('✅ Phase completion test triggered');
    } catch (error) {
      this.addLog(`❌ Test failed: ${error}`);
    }
  }

  refreshStatus() {
    this.status = this.testService.getNotificationStatus();
    this.addLog('📊 Status refreshed');
  }

  private addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.logs.unshift(`[${timestamp}] ${message}`);
    if (this.logs.length > 50) {
      this.logs = this.logs.slice(0, 50);
    }
  }
}