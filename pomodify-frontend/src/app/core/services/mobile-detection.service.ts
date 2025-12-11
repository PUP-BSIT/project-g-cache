import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MobileDetectionService {

  /**
   * Detect if the current device is mobile
   */
  isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check user agent for mobile devices
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    
    // Mobile device patterns
    const mobilePatterns = [
      /Android/i,
      /webOS/i,
      /iPhone/i,
      /iPad/i,
      /iPod/i,
      /BlackBerry/i,
      /Windows Phone/i,
      /Mobile/i,
      /Tablet/i
    ];
    
    const isMobileUserAgent = mobilePatterns.some(pattern => pattern.test(userAgent));
    
    // Also check screen size (mobile-like dimensions)
    const isMobileScreen = window.innerWidth <= 768 || window.innerHeight <= 768;
    
    // Check for touch capability
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return isMobileUserAgent || (isMobileScreen && isTouchDevice);
  }

  /**
   * Detect if device is tablet
   */
  isTablet(): boolean {
    if (typeof window === 'undefined') return false;
    
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    
    // Tablet patterns
    const tabletPatterns = [
      /iPad/i,
      /Android(?!.*Mobile)/i, // Android tablets don't have "Mobile" in user agent
      /Tablet/i
    ];
    
    const isTabletUserAgent = tabletPatterns.some(pattern => pattern.test(userAgent));
    const isTabletScreen = window.innerWidth >= 768 && window.innerWidth <= 1024;
    
    return isTabletUserAgent || isTabletScreen;
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