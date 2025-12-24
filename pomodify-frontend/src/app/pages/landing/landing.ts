import { Component, OnInit, OnDestroy } from '@angular/core';
import { Header } from '../../shared/components/header/header';
import { RouterLink } from '@angular/router';
import { Footer } from '../../shared/components/footer/footer';
import { ensurePublicPageLightTheme } from '../../shared/theme';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [Header, RouterLink, Footer, CommonModule],
  templateUrl: './landing.html',
  styleUrls: ['./landing.scss'],
})
export class Landing implements OnInit, OnDestroy {
  currentSlide = 0;
  slides = [0, 1, 2, 3, 4]; // 5 feature cards
  faqs: Array<{ q: string; a: string }> = [
    { q: 'What is Pomodify?', a: 'Pomodify is a productivity web app based on the Pomodoro method — custom timers, activity tracking, session notes, and progress reports to help you focus.' },
    { q: 'Do I need an account to use it?', a: 'You can explore the landing and some demo content, but creating an account lets you save activities, sessions, and progress across devices.' },
    { q: 'Can I customize timer lengths?', a: 'Yes — set work durations, short breaks, and long breaks to fit your personal rhythm.' },
    { q: 'How are activities organized?', a: 'Activities are user-defined tags (e.g. "Study Math") that you can create, rename, and delete to categorize sessions.' },
    { q: 'Where do my session notes go?', a: 'After each session you can add notes which are stored with that session and viewable in your activity history.' },
    { q: 'Is my data private and secure?', a: 'Accounts are protected and user data is stored securely; you control your profile and can delete content at any time.' },
    { q: 'Does Pomodify provide reports?', a: 'Yes — view summaries of your sessions, total time per activity, and progress trends over time.' },
    { q: 'Can I use Pomodify on mobile?', a: 'Pomodify is responsive and works well on mobile browsers; a mobile-optimized layout is provided for smaller screens.' },
    { q: 'Can I export my data?', a: 'Planned export features let you download session summaries and activity logs — check account settings for available options.' },
    { q: 'How do I get help or report bugs?', a: 'Use the support or feedback links in the app or visit the project repository to open an issue — we appreciate bug reports and suggestions.' },
  ];
  faqOpen: boolean[] = this.faqs.map(() => false);
  // Pagination for FAQ: show N per page
  readonly faqPageSize = 5;
  currentFaqPage = 0; // zero-based
  animateFaq = false;
  private autoPlayInterval: any;
  private readonly AUTO_PLAY_DELAY = 5000; // 5 seconds

  ngOnInit(): void {
    // Force light theme on landing page
    ensurePublicPageLightTheme();
    this.startAutoPlay();
  }

  toggleFaq(index: number): void {
    // allow only one open at a time for compact layout
    const currentlyOpen = this.faqOpen[index];
    this.faqOpen = this.faqs.map(() => false);
    this.faqOpen[index] = !currentlyOpen;
  }

  // FAQ pagination helpers
  get faqPageCount(): number {
    return Math.ceil(this.faqs.length / this.faqPageSize);
  }

  // Returns array of items with their global index for the current page
  get pagedFaqs(): Array<{ item: { q: string; a: string }; index: number }> {
    const start = this.currentFaqPage * this.faqPageSize;
    return this.faqs.slice(start, start + this.faqPageSize).map((it, idx) => ({ item: it, index: start + idx }));
  }

  get faqPages(): number[] {
    return Array.from({ length: this.faqPageCount }, (_, i) => i);
  }

  goToFaqPage(page: number): void {
    if (page < 0 || page >= this.faqPageCount) return;
    // trigger a small page transition animation
    this.animateFaq = true;
    setTimeout(() => {
      this.currentFaqPage = page;
      // ensure any open FAQ on previous page is closed
      this.faqOpen = this.faqs.map(() => false);
      this.animateFaq = false;
    }, 260);
  }

  nextFaqPage(): void {
    this.goToFaqPage((this.currentFaqPage + 1) % this.faqPageCount);
  }

  prevFaqPage(): void {
    this.goToFaqPage((this.currentFaqPage - 1 + this.faqPageCount) % this.faqPageCount);
  }

  isOpen(index: number): boolean {
    return !!this.faqOpen[index];
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }

  startAutoPlay(): void {
    this.autoPlayInterval = setInterval(() => {
      this.nextSlide();
    }, this.AUTO_PLAY_DELAY);
  }

  stopAutoPlay(): void {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
    this.stopAutoPlay();
    this.startAutoPlay();
  }

  getSlideOffset(): string {
    return `${-this.currentSlide * 100}%`;
  }
}
