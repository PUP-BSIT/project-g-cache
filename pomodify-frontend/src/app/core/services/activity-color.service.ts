import { Injectable } from '@angular/core';
import { Logger } from './logger.service';

/**
 * Service to manage activity color tags in localStorage
 * Since the backend doesn't store color tags, we store them client-side
 */
@Injectable({
  providedIn: 'root'
})
export class ActivityColorService {
  private readonly STORAGE_KEY = 'activity_colors';

  /**
   * Get color tag for an activity
   */
  getColorTag(activityId: number): string | null {
    try {
      const colors = this.getAllColors();
      return colors[activityId] || null;
    } catch (e) {
      Logger.warn('[ActivityColorService] Error reading colors:', e);
      return null;
    }
  }

  /**
   * Set color tag for an activity
   */
  setColorTag(activityId: number, colorTag: string): void {
    try {
      const colors = this.getAllColors();
      colors[activityId] = colorTag;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(colors));
    } catch (e) {
      Logger.warn('[ActivityColorService] Error saving color:', e);
    }
  }

  /**
   * Remove color tag for an activity
   */
  removeColorTag(activityId: number): void {
    try {
      const colors = this.getAllColors();
      delete colors[activityId];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(colors));
    } catch (e) {
      Logger.warn('[ActivityColorService] Error removing color:', e);
    }
  }

  /**
   * Get all color mappings
   */
  private getAllColors(): Record<number, string> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      Logger.warn('[ActivityColorService] Error parsing colors:', e);
      return {};
    }
  }

  /**
   * Clear all color mappings
   */
  clearAll(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {
      Logger.warn('[ActivityColorService] Error clearing colors:', e);
    }
  }
}
