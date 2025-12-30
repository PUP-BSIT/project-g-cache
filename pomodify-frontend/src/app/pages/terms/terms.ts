import { Component } from '@angular/core';
import { Header } from '../../shared/components/header/header';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [Header],
  templateUrl: './terms.html',
  styleUrls: ['./terms.scss']
})
export class TermsComponent {}
