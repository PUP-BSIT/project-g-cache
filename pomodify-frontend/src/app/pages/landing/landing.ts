import { Component, OnInit } from '@angular/core';
import { Header } from '../../shared/components/header/header';
import { RouterLink } from '@angular/router';
import { Footer } from '../../shared/components/footer/footer';
import { ensurePublicPageLightTheme } from '../../shared/theme';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [Header, RouterLink, Footer],
  templateUrl: './landing.html',
  styleUrls: ['./landing.scss'],
})
export class Landing implements OnInit {
  ngOnInit(): void {
    // Force light theme on landing page
    ensurePublicPageLightTheme();
  }
}
