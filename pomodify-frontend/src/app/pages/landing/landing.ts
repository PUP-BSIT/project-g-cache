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
  private autoPlayInterval: any;
  private readonly AUTO_PLAY_DELAY = 5000; // 5 seconds

  ngOnInit(): void {
    // Force light theme on landing page
    ensurePublicPageLightTheme();
    this.startAutoPlay();
  }

  toggleFaq(index: number): void {
    this.faqOpen[index] = !this.faqOpen[index];
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
