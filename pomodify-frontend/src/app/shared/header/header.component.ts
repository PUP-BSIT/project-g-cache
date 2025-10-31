import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, NgClass],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  readonly brandSrc = 'assets/images/logo-with-name.png';

  readonly mainNav = [
    { label: 'Home', link: '/' },
    { label: 'Subscribe', link: '#subscribe' }
  ];

  readonly featureItems = [
    { label: 'Custom Timers', link: '#custom-timers' },
    { label: 'Activities', link: '#activities' },
    { label: 'Session Notes', link: '#session-notes' },
    { label: 'Reports', link: '#reports' }
  ];

  menuOpen = signal(false);
  toggleMenu() { this.menuOpen.update(v => !v); }
  closeMenu() { this.menuOpen.set(false); }
}
