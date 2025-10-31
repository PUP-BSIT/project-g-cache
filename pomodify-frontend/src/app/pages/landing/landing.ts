import { Component } from '@angular/core';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [FooterComponent],
  templateUrl: './landing.html',
  styleUrls: ['./landing.module.scss']
})
export class LandingComponent {}
