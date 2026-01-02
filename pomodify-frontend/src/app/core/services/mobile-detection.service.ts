import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MobileDetectionService {

  /**
   * Detect if the current device is mobile
   * Only uses user agent - screen size and touch are NOT reliable indicators
   * (laptops can have small screens and touch capability)
   */
  isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    
    // Mobile device patterns - ONLY check user agent
    const mobilePatterns = [
      /Android.*Mobile/i,  // Android phones (not tablets)
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

  /**
   * Detect if device is tablet
   */
  isTablet(): boolean {
    if (typeof window === 'undefined') return false;
    
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    
    // Tablet patterns - ONLY check user agent
    const tabletPatterns = [
      /iPad/i,
      /Android(?!.*Mobile)/i, // Android tablets don't have "Mobile" in user agent
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