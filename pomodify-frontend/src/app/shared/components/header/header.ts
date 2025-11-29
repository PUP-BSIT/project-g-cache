import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
})
export class Header {
  constructor(private router: Router) {}

  scrollToFeature(featureId: string): void {
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
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Add highlight effect
      element.classList.add('highlight');
      setTimeout(() => element.classList.remove('highlight'), 2000);
    }
  }
}
