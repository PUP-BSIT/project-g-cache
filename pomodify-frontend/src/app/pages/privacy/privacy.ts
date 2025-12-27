import { Component } from '@angular/core';
import { Header } from '../../shared/components/header/header';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [Header],
  templateUrl: './privacy.html',
  styleUrls: ['./privacy.scss']
})
export class PrivacyComponent {}
