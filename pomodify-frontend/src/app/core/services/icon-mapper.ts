/**
 * Icon Mapper Service
 * Maps activities to Font Awesome icons using multiple strategies:
 * 1. Exact/partial name matching
 * 2. Category-based matching
 * 3. Intelligent word-analysis based icon selection
 * 4. Smart fallback with suggestions
 */
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class IconMapper {
  // Keyword → Icon mappings for intelligent matching
  private readonly keywordIconMap: Record<string, string> = {
    // Programming & Code (Brand icons use fa-brands)
    'angular': 'fa-brands fa-angular',
    'react': 'fa-brands fa-react',
    'vue': 'fa-brands fa-vuejs',
    'python': 'fa-brands fa-python',
    'javascript': 'fa-brands fa-js',
    'typescript': 'fa-brands fa-js',
    'java': 'fa-brands fa-java',
    'kotlin': 'fa-solid fa-code',
    'code': 'fa-solid fa-code',
    'coding': 'fa-solid fa-laptop-code',
    'programming': 'fa-solid fa-code',
    'develop': 'fa-solid fa-laptop-code',
    'devops': 'fa-solid fa-code',
    'api': 'fa-solid fa-plug',
    'database': 'fa-solid fa-database',
    'server': 'fa-solid fa-server',
    'backend': 'fa-solid fa-server',
    'frontend': 'fa-solid fa-desktop',
    'web': 'fa-solid fa-globe',
    'app': 'fa-solid fa-mobile',
    'mobile': 'fa-solid fa-mobile',

    // Science & Study
    'math': 'fa-solid fa-calculator',
    'physics': 'fa-solid fa-flask',
    'chemistry': 'fa-solid fa-flask-vial',
    'biology': 'fa-solid fa-microscope',
    'science': 'fa-solid fa-microscope',
    'study': 'fa-solid fa-book',
    'learn': 'fa-solid fa-book-open',
    'reading': 'fa-solid fa-book-open',
    'lecture': 'fa-solid fa-graduation-cap',
    'course': 'fa-solid fa-graduation-cap',
    'education': 'fa-graduation-cap',
    'research': 'fa-flask',
    'lab': 'fa-flask',
    'experiment': 'fa-flask',

    // Design & Creative
    'design': 'fa-palette',
    'ui': 'fa-pen-ruler',
    'ux': 'fa-pen-ruler',
    'graphic': 'fa-image',
    'art': 'fa-paintbrush',
    'paint': 'fa-paintbrush',
    'sketch': 'fa-pencil',
    'prototype': 'fa-pen-ruler',
    'figma': 'fa-pen-ruler',
    'photoshop': 'fa-image',
    'illustrator': 'fa-palette',
    'animation': 'fa-film',
    'video': 'fa-video',
    'photo': 'fa-camera',
    'photography': 'fa-camera',
    'music': 'fa-music',
    'audio': 'fa-headphones',
    'sound': 'fa-headphones',
    'creative': 'fa-sparkles',

    // Documents & Writing
    'document': 'fa-file-lines',
    'documentation': 'fa-file-pdf',
    'writing': 'fa-pen-fancy',
    'write': 'fa-pen-fancy',
    'blog': 'fa-blog',
    'article': 'fa-newspaper',
    'paper': 'fa-file-lines',
    'pdf': 'fa-file-pdf',
    'word': 'fa-file-word',
    'sheet': 'fa-file-excel',
    'excel': 'fa-file-excel',
    'powerpoint': 'fa-file-powerpoint',
    'slides': 'fa-file-powerpoint',
    'presentation': 'fa-presentation',
    'report': 'fa-file-lines',
    'notes': 'fa-note-sticky',
    'journal': 'fa-book',

    // Business & Work
    'work': 'fa-briefcase',
    'business': 'fa-briefcase',
    'job': 'fa-briefcase',
    'meeting': 'fa-handshake',
    'conference': 'fa-people-group',
    'team': 'fa-people-group',
    'project': 'fa-folder',
    'task': 'fa-tasks',
    'todo': 'fa-list-check',
    'planning': 'fa-calendar',
    'schedule': 'fa-calendar',
    'deadline': 'fa-hourglass-end',
    'marketing': 'fa-megaphone',
    'sales': 'fa-chart-line',
    'finance': 'fa-coins',
    'accounting': 'fa-calculator',
    'hr': 'fa-people-group',
    'management': 'fa-chart-pie',
    'analysis': 'fa-chart-bar',
    'analytics': 'fa-chart-line',

    // Health & Fitness
    'health': 'fa-heart-pulse',
    'fitness': 'fa-dumbbell',
    'exercise': 'fa-person-running',
    'gym': 'fa-dumbbell',
    'yoga': 'fa-person-hiking',
    'running': 'fa-person-running',
    'sport': 'fa-person-running',
    'sports': 'fa-person-running',
    'meditation': 'fa-person-hiking',
    'wellness': 'fa-spa',
    'nutrition': 'fa-utensils',
    'diet': 'fa-utensils',
    'food': 'fa-utensils',
    'cooking': 'fa-utensils',

    // Travel & Lifestyle
    'travel': 'fa-suitcase',
    'trip': 'fa-suitcase',
    'vacation': 'fa-suitcase',
    'tourism': 'fa-map',
    'adventure': 'fa-mountain',
    'hiking': 'fa-person-hiking',
    'camping': 'fa-tent',
    'beach': 'fa-water',
    'mountain': 'fa-mountain',
    'explore': 'fa-compass',
    'journey': 'fa-road',

    // Social & People
    'people': 'fa-people-group',
    'community': 'fa-people-group',
    'social': 'fa-people-group',
    'friend': 'fa-user-group',
    'family': 'fa-person-family',
    'networking': 'fa-network-wired',
    'collaboration': 'fa-handshake',

    // Technology & Tools
    'technology': 'fa-microchip',
    'tech': 'fa-microchip',
    'ai': 'fa-robot',
    'machine learning': 'fa-brain',
    'data': 'fa-database',
    'cloud': 'fa-cloud',
    'testing': 'fa-flask-vial',
    'security': 'fa-shield',
    'network': 'fa-network-wired',
    'hardware': 'fa-microchip',

    // General/Default
    'general': 'fa-bookmark',
    'other': 'fa-circle-dot',
    'personal': 'fa-user',
    'hobby': 'fa-gamepad',
    'entertainment': 'fa-gamepad',
    'gaming': 'fa-gamepad',
    'game': 'fa-gamepad',
  };

  // Category → Icon set mappings for suggestions
  private readonly categoryIcons: Record<string, string[]> = {
    'Programming': ['fa-code', 'fa-laptop-code', 'fa-angular', 'fa-js', 'fa-database', 'fa-server'],
    'Study': ['fa-book', 'fa-book-open', 'fa-calculator', 'fa-flask', 'fa-microscope', 'fa-graduation-cap'],
    'Design': ['fa-palette', 'fa-paintbrush', 'fa-pen-ruler', 'fa-image', 'fa-film', 'fa-camera'],
    'Work': ['fa-briefcase', 'fa-chart-line', 'fa-presentation', 'fa-tasks', 'fa-folder', 'fa-handshake'],
    'Health': ['fa-dumbbell', 'fa-heart-pulse', 'fa-person-running', 'fa-utensils', 'fa-spa', 'fa-yoga'],
    'Creative': ['fa-palette', 'fa-music', 'fa-camera', 'fa-pen-fancy', 'fa-paintbrush', 'fa-sparkles'],
    'Business': ['fa-briefcase', 'fa-chart-pie', 'fa-coins', 'fa-megaphone', 'fa-people-group', 'fa-handshake'],
    'Science': ['fa-flask', 'fa-microscope', 'fa-flask-vial', 'fa-brain', 'fa-database', 'fa-chart-bar'],
    'Travel': ['fa-suitcase', 'fa-map', 'fa-mountain', 'fa-compass', 'fa-plane', 'fa-car'],
    'Personal': ['fa-user', 'fa-heart', 'fa-lightbulb', 'fa-star', 'fa-bookmark', 'fa-note-sticky'],
    'Entertainment': ['fa-gamepad', 'fa-film', 'fa-music', 'fa-tv', 'fa-dice', 'fa-theater-masks'],
    'Other': ['fa-bookmark', 'fa-circle-dot', 'fa-star', 'fa-lightbulb'],
  };

  /**
   * Get Font Awesome icon class using intelligent word analysis
   * Checks keywords in activity name and category, returns best match
   * Returns full class string with fa-solid/fa-brands prefix
   */
  getIconClass(activityName: string, category?: string): string {
    const nameWords = this.extractKeywords(activityName);
    const categoryWords = category ? this.extractKeywords(category) : [];
    const allWords = [...nameWords, ...categoryWords];

    // Try to find the best matching icon from keywords
    for (const word of allWords) {
      const icon = this.keywordIconMap[word];
      if (icon) {
        // If icon already has prefix (fa-solid or fa-brands), return as-is
        if (icon.startsWith('fa-solid') || icon.startsWith('fa-brands')) {
          return icon;
        }
        // Otherwise, add fa-solid prefix
        return `fa-solid ${icon}`;
      }
    }

    // Try category-based lookup
    if (category && this.categoryIcons[category]) {
      const icons = this.categoryIcons[category];
      const icon = icons[0];
      // Add fa-solid prefix if not present
      if (icon.startsWith('fa-solid') || icon.startsWith('fa-brands')) {
        return icon;
      }
      return `fa-solid ${icon}`;
    }

    // Default fallback
    return 'fa-solid fa-bookmark';
  }

  /**
   * Extract keywords from text by splitting and cleaning
   * Handles compound words and phrases
   */
  private extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    const lowercased = text.toLowerCase();

    // Split by spaces and special characters
    const words = lowercased.split(/[\s\-_\/]+/).filter((w) => w.length > 0);

    // Add individual words
    keywords.push(...words);

    // Add some common compound phrases
    for (let i = 0; i < words.length - 1; i++) {
      keywords.push(`${words[i]} ${words[i + 1]}`);
    }

    return keywords;
  }

  /**
   * Get the full Font Awesome classes string for display
   */
  getFullIconClasses(activityName: string, category?: string): string {
    const iconName = this.getIconClass(activityName, category);
    return `fa-solid ${iconName}`;
  }

  /**
   * Get a list of suggested icons for a given category
   */
  getSuggestedIcons(category: string): string[] {
    return this.categoryIcons[category] || this.categoryIcons['Other'];
  }

  /**
   * Suggest icons based on activity name + category
   * Used for activity creation/editing UI
   */
  suggestIcons(activityName: string, category?: string): string[] {
    const bestMatch = this.getIconClass(activityName, category);
    const categoryIcons = category ? this.categoryIcons[category] : this.categoryIcons['Personal'];

    // Return unique icons: best match first, then category icons
    const suggested = [bestMatch, ...categoryIcons];
    return Array.from(new Set(suggested)).slice(0, 8); // Return max 8 unique suggestions
  }

  /**
   * Get color/emoji tag (optional visual enhancement)
   * Returns a visual tag that pairs with the icon
   */
  getActivityColor(activityName: string, category?: string): string {
    const colorMap: Record<string, string> = {
      'Programming': 'blue',
      'Study': 'teal',
      'Design': 'purple',
      'Work': 'orange',
      'Health': 'green',
      'Creative': 'pink',
      'Business': 'indigo',
      'Science': 'cyan',
      'Travel': 'amber',
      'Personal': 'gray',
      'Entertainment': 'red',
    };

    if (category && colorMap[category]) {
      return colorMap[category];
    }

    return 'gray'; // Default fallback
  }
}
