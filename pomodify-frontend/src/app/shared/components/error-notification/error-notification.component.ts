import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-error-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-notification.component.html',
  styleUrls: ['./error-notification.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(400px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateX(400px)' }))
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorNotificationComponent implements OnInit, OnDestroy {
  @Input() title: string = 'Error!';
  @Input() message: string = '';
  @Input() duration: number = 5000;

  isVisible = true;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.startTimer();
  }

  ngOnDestroy(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }
  }

  private startTimer(): void {
    this.timeoutId = setTimeout(() => {
      this.close();
    }, this.duration);
  }

  close(): void {
    this.isVisible = false;
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }
  }
}
