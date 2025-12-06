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
          <div class="column-header">MINUTES</div>
          <div class="scroll-wrapper">
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
            <div class="selection-indicator"></div>
          </div>
        </div>

        <div class="separator">:</div>

        <!-- Seconds Column -->
        <div class="time-column">
          <div class="column-header">SECONDS</div>
          <div class="scroll-wrapper">
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
            <div class="selection-indicator"></div>
          </div>
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
      padding: 1rem;
      user-select: none;
    }

    .time-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2rem;
      background: #F8F9FA;
      border-radius: 16px;
      padding: 24px 40px;
      border: 2px solid #E0E0E0;
      min-width: 450px;
    }

    .time-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .column-header {
      font-size: 12px;
      font-weight: 700;
      color: #5FA9A4;
      letter-spacing: 1.5px;
      text-align: center;
    }

    .scroll-wrapper {
      position: relative;
      background: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      border: 1px solid #E8E8E8;
    }

    .scroll-container {
      height: 210px;
      overflow-y: auto;
      scroll-snap-type: y mandatory;
      scrollbar-width: thin;
      scrollbar-color: #5FA9A4 #F0F0F0;
      width: 100px;
      position: relative;
      padding: 0 12px;
      
      /* Custom scrollbar for webkit */
      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: #F5F5F5;
        border-radius: 10px;
      }

      &::-webkit-scrollbar-thumb {
        background: #5FA9A4;
        border-radius: 10px;

        &:hover {
          background: #4D8B87;
        }
      }
    }

    .selection-indicator {
      display: none;
    }

    .time-digit {
      font-size: 2rem;
      font-weight: 500;
      color: #7F8C8D;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
      scroll-snap-align: center;
      cursor: pointer;
      transition: all 0.25s ease;
      font-family: 'Inter', 'Segoe UI', sans-serif;
      border-radius: 8px;

      &:hover {
        color: #34495E;
        background: rgba(95, 169, 164, 0.1);
      }

      &.selected {
        color: #FFFFFF;
        font-weight: 700;
        font-size: 2.5rem;
        background: #5FA9A4;
        box-shadow: 0 4px 8px rgba(95, 169, 164, 0.3);
      }
    }

    .separator {
      font-size: 2.5rem;
      font-weight: 700;
      color: #5FA9A4;
      margin: 0 0.5rem;
      padding-top: 24px;
      flex-shrink: 0;
    }

    .overlay-disabled {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 16px;
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
