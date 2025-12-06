import { Component, input, model, computed, effect, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Pure Presentation Component (Dumb Component)
 * Digital Clock Picker with iOS-style scroll snap
 */
@Component({
  selector: 'app-digital-clock-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="digital-clock-picker">
      <div class="time-container">
        <!-- Minutes Column -->
        <div class="time-column">
          <div class="scroll-container" #minutesScroll>
            @for (min of minutes(); track min) {
              <div 
                class="time-digit" 
                [class.selected]="min === time().minutes"
                (click)="selectMinute(min)">
                {{ min.toString().padStart(2, '0') }}
              </div>
            }
          </div>
          <div class="label">MIN</div>
        </div>

        <div class="separator">:</div>

        <!-- Seconds Column -->
        <div class="time-column">
          <div class="scroll-container" #secondsScroll>
            @for (sec of seconds(); track sec) {
              <div 
                class="time-digit" 
                [class.selected]="sec === time().seconds"
                (click)="selectSecond(sec)">
                {{ sec.toString().padStart(2, '0') }}
              </div>
            }
          </div>
          <div class="label">SEC</div>
        </div>
      </div>

      @if (!isEditable()) {
        <div class="overlay-disabled"></div>
      }
    </div>
  `,
  styles: [`
    .digital-clock-picker {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2rem;
      user-select: none;
    }

    .time-container {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 24px;
      padding: 1.5rem 2rem;
      backdrop-filter: blur(10px);
      border: 2px solid rgba(26, 188, 156, 0.2);
    }

    .time-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .scroll-container {
      height: 200px;
      overflow-y: auto;
      scroll-snap-type: y mandatory;
      scrollbar-width: none;
      -ms-overflow-style: none;
      width: 80px;
      position: relative;
      
      /* Custom scrollbar for webkit */
      &::-webkit-scrollbar {
        display: none;
      }
    }

    .time-digit {
      font-size: 3rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.3);
      height: 66px;
      display: flex;
      align-items: center;
      justify-content: center;
      scroll-snap-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      font-family: 'Roboto Mono', monospace;

      &:hover {
        color: rgba(26, 188, 156, 0.6);
        transform: scale(1.1);
      }

      &.selected {
        color: #1abc9c;
        transform: scale(1.2);
        text-shadow: 0 0 20px rgba(26, 188, 156, 0.5);
      }
    }

    .separator {
      font-size: 4rem;
      font-weight: 700;
      color: #1abc9c;
      margin: 0 0.5rem;
      animation: blink 2s infinite;
    }

    @keyframes blink {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0.3; }
    }

    .label {
      font-size: 0.75rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.5);
      letter-spacing: 2px;
    }

    .overlay-disabled {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 24px;
      cursor: not-allowed;
      backdrop-filter: blur(2px);
    }
  `]
})
export class DigitalClockPickerComponent implements AfterViewInit {
  // ModelSignal for two-way binding
  time = model.required<{ minutes: number; seconds: number }>();
  
  // Input for editable state
  isEditable = input<boolean>(true);

  // ViewChild references for auto-scroll
  @ViewChild('minutesScroll') minutesScrollRef!: ElementRef<HTMLDivElement>;
  @ViewChild('secondsScroll') secondsScrollRef!: ElementRef<HTMLDivElement>;

  // Generate number arrays
  minutes = computed(() => Array.from({ length: 61 }, (_, i) => i)); // 0-60
  seconds = computed(() => Array.from({ length: 60 }, (_, i) => i)); // 0-59

  constructor() {
    // Auto-scroll to selected values when time changes
    effect(() => {
      const currentTime = this.time();
      this.scrollToSelected();
    });
  }

  ngAfterViewInit() {
    this.scrollToSelected();
  }

  selectMinute(min: number) {
    if (!this.isEditable()) return;
    this.time.update(t => ({ ...t, minutes: min }));
  }

  selectSecond(sec: number) {
    if (!this.isEditable()) return;
    this.time.update(t => ({ ...t, seconds: sec }));
  }

  private scrollToSelected() {
    setTimeout(() => {
      if (this.minutesScrollRef) {
        const minuteElement = this.minutesScrollRef.nativeElement
          .querySelector('.time-digit.selected') as HTMLElement;
        if (minuteElement) {
          minuteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      if (this.secondsScrollRef) {
        const secondElement = this.secondsScrollRef.nativeElement
          .querySelector('.time-digit.selected') as HTMLElement;
        if (secondElement) {
          secondElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 50);
  }
}
