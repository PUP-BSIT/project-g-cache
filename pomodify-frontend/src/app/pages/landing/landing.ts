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
  private autoPlayInterval: any;
  private readonly AUTO_PLAY_DELAY = 5000; // 5 seconds

  ngOnInit(): void {
    // Force light theme on landing page
    ensurePublicPageLightTheme();
    this.startAutoPlay();
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
