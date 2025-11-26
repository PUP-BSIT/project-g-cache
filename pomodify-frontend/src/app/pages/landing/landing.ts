import { Component } from '@angular/core';
import { Header } from '../../shared/components/header/header';
import { RouterLink } from '@angular/router';
import { Footer } from '../../shared/components/footer/footer';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [Header, RouterLink, Footer],
  templateUrl: './landing.html',
  styleUrls: ['./landing.scss'],
})
export class Landing {}
