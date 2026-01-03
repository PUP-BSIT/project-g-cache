import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
})
export class Header implements OnInit {
  mobileMenuOpen = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.updateBodyClass();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    this.updateBodyClass();
  }

  private updateBodyClass(): void {
    if (this.mobileMenuOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
  }

  scrollToFeature(featureId: string): void {
    this.mobileMenuOpen = false; // Close menu after selection
    this.updateBodyClass();
    // Navigate to landing page first if not already there
    if (this.router.url !== '/' && this.router.url !== '/landing') {
      this.router.navigate(['/']).then(() => {
        setTimeout(() => this.scrollToElement(featureId), 100);
      });
    } else {
      this.scrollToElement(featureId);
    }
  }

  private scrollToElement(featureId: string): void {
    const element = document.getElementById(featureId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      // Add highlight effect
      element.classList.add('highlight');
      setTimeout(() => element.classList.remove('highlight'), 2000);
    }
  }
}
