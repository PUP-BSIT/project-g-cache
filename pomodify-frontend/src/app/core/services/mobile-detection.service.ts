import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MobileDetectionService {

  isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

    const mobilePatterns = [
      /Android.*Mobile/i,  
      /webOS/i,
      /iPhone/i,
      /iPod/i,
      /BlackBerry/i,
      /Windows Phone/i,
      /Opera Mini/i,
      /IEMobile/i
    ];
    
    return mobilePatterns.some(pattern => pattern.test(userAgent));
  }
  isTablet(): boolean {
    if (typeof window === 'undefined') return false;
    
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

    const tabletPatterns = [
      /iPad/i,
      /Android(?!.*Mobile)/i, 
      /Tablet/i
    ];
    
    return tabletPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Get device type
   */
  getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (this.isMobile()) return 'mobile';
    if (this.isTablet()) return 'tablet';
    return 'desktop';
  }

  /**
   * Check if device supports PWA notifications
   */
  supportsPWANotifications(): boolean {
    return 'serviceWorker' in navigator && 'Notification' in window;
  }
}