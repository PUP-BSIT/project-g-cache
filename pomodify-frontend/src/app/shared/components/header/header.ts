import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
})
export class Header implements OnInit, OnDestroy {
  mobileMenuOpen = false;
  isContactPage = false;
  private routerSubscription?: Subscription;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.updateBodyClass();
    this.checkCurrentRoute();
    
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.checkCurrentRoute());
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  private checkCurrentRoute(): void {
    this.isContactPage = this.router.url === '/contact';
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    this.updateBodyClass();
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
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
