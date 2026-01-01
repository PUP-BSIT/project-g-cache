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
      <div class="time-display">
        <!-- Minutes -->
        <div class="time-section">
          <div class="section-label">MINUTES</div>
          <div class="digit-wrapper">
            <div class="fade-overlay top"></div>
            <div class="digit-container" #minutesScroll>
              @for (min of minutes(); track min) {
                <div 
                  class="digit-option" 
                  [class.selected]="min === time().minutes"
                  (click)="selectMinute(min)">
                  {{ min.toString().padStart(2, '0') }}
                </div>
              }
            </div>
            <div class="fade-overlay bottom"></div>
          </div>
        </div>

        <div class="colon">:</div>

        <!-- Seconds -->
        <div class="time-section">
          <div class="section-label">SECONDS</div>
          <div class="digit-wrapper">
            <div class="fade-overlay top"></div>
            <div class="digit-container" #secondsScroll>
              @for (sec of seconds(); track sec) {
                <div 
                  class="digit-option" 
                  [class.selected]="sec === time().seconds"
                  (click)="selectSecond(sec)">
                  {{ sec.toString().padStart(2, '0') }}
                </div>
              }
            </div>
            <div class="fade-overlay bottom"></div>
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
      padding: 20px 32px;
      user-select: none;
      width: 100%;
      background: #F5F3FF;
      border-radius: 16px;
      height: 240px;
      overflow: hidden;
      box-sizing: border-box;
    }

    .time-display {
      display: flex;
      align-items: center;
      justify-content: space-around;
      gap: 1.5rem;
      width: 100%;
      height: 100%;
    }

    .time-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      flex: 1;
      height: 100%;
      max-width: 350px;
    }

    .section-label {
      font-size: 11px;
      font-weight: 600;
      color: #9CA3AF;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .digit-wrapper {
      position: relative;
      width: 100%;
      height: 160px;
      overflow: hidden !important;
      -webkit-mask-image: linear-gradient(to bottom, transparent 0, black 60px, black calc(100% - 60px), transparent 100%);
      mask-image: linear-gradient(to bottom, transparent 0, black 60px, black calc(100% - 60px), transparent 100%);
    }

    .fade-overlay {
      position: absolute;
      left: 0;
      right: 0;
      height: 60px;
      pointer-events: none;
      z-index: 2;
      
      &.top {
        top: 0;
        background: linear-gradient(180deg, #F5F3FF 0%, rgba(245, 243, 255, 0) 100%);
      }
      
      &.bottom {
        bottom: 0;
        background: linear-gradient(0deg, #F5F3FF 0%, rgba(245, 243, 255, 0) 100%);
      }
    }

    .digit-container {
      width: 100%;
      height: 160px;
      overflow-y: scroll;
      overflow-x: hidden;
      scroll-snap-type: y mandatory;
      scrollbar-width: none !important;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      -ms-overflow-style: none !important;
      scroll-behavior: smooth;
      
      &::-webkit-scrollbar {
        display: none !important;
      }
    }

    .digit-option {
      font-size: 7rem;
      font-weight: 800;
      color: #E5E7EB;
      height: 160px;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      scroll-snap-align: center;
      cursor: pointer;
      transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: 'Segoe UI', 'Arial', sans-serif;
      flex-shrink: 0;

      &:hover {
        color: #5FA9A4;
        transform: scale(1.05);
      }

      &.selected {
        color: #5FA9A4;
        font-weight: 900;
        transform: scale(1.1);
      }
    }

    .colon {
      font-size: 7rem;
      font-weight: 900;
      color: #5FA9A4;
      margin: 0;
      padding-top: 25px;
      flex-shrink: 0;
      width: 60px;
      text-align: center;
    }

    .overlay-disabled {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 20px;
      cursor: not-allowed;
      backdrop-filter: blur(2px);
    }

    @media (max-width: 600px) {
      .digital-clock-picker {
        padding: 8px;
        height: 100px;
        border-radius: 8px;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        overflow: hidden;
      }

      .time-display {
        gap: 6px;
        justify-content: center;
        align-items: center;
        width: 100%;
        max-width: 100%;
      }

      .time-section {
        gap: 2px;
        width: 70px;
        min-width: 70px;
        max-width: 70px;
        flex: 0 0 70px;
      }

      .section-label {
        font-size: 8px;
        letter-spacing: 0.3px;
        margin-bottom: 1px;
      }

      .digit-wrapper {
        height: 60px;
        -webkit-mask-image: linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%);
        mask-image: linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%);
      }

      .fade-overlay {
        height: 12px;
      }

      .digit-container {
        height: 60px;
      }

      .digit-option {
        font-size: 1.6rem;
        height: 60px;
        
        &:hover {
          transform: none;
        }

        &.selected {
          transform: none;
        }
      }

      .colon {
        font-size: 1.6rem;
        width: 16px;
        min-width: 16px;
        padding-top: 12px;
        flex: 0 0 16px;
      }
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

  // Scroll debounce timers
  private minutesScrollTimeout: any;
  private secondsScrollTimeout: any;
  private isInitialScroll = true;

  constructor() {
    // Auto-scroll to selected values when time changes
    effect(() => {
      const currentTime = this.time();
      this.scrollToSelected();
    });
  }

  ngAfterViewInit() {
    this.scrollToSelected();
    
    // Add scroll listeners to detect scroll-based selection
    setTimeout(() => {
      this.setupScrollListeners();
      this.isInitialScroll = false;
    }, 200);
  }

  private setupScrollListeners() {
    if (this.minutesScrollRef) {
      this.minutesScrollRef.nativeElement.addEventListener('scroll', () => {
        if (this.isInitialScroll) return;
        clearTimeout(this.minutesScrollTimeout);
        this.minutesScrollTimeout = setTimeout(() => {
          this.detectMinuteFromScroll();
        }, 100);
      });
    }

    if (this.secondsScrollRef) {
      this.secondsScrollRef.nativeElement.addEventListener('scroll', () => {
        if (this.isInitialScroll) return;
        clearTimeout(this.secondsScrollTimeout);
        this.secondsScrollTimeout = setTimeout(() => {
          this.detectSecondFromScroll();
        }, 100);
      });
    }
  }

  private detectMinuteFromScroll() {
    if (!this.isEditable() || !this.minutesScrollRef) return;
    
    const container = this.minutesScrollRef.nativeElement;
    const itemHeight = container.querySelector('.digit-option')?.clientHeight || 160;
    const scrollTop = container.scrollTop;
    const selectedIndex = Math.round(scrollTop / itemHeight);
    const newMinute = Math.min(60, Math.max(0, selectedIndex));
    
    if (newMinute !== this.time().minutes) {
      console.log('📜 Scroll detected minute:', newMinute);
      this.time.update(t => ({ ...t, minutes: newMinute }));
    }
  }

  private detectSecondFromScroll() {
    if (!this.isEditable() || !this.secondsScrollRef) return;
    
    const container = this.secondsScrollRef.nativeElement;
    const itemHeight = container.querySelector('.digit-option')?.clientHeight || 160;
    const scrollTop = container.scrollTop;
    const selectedIndex = Math.round(scrollTop / itemHeight);
    const newSecond = Math.min(59, Math.max(0, selectedIndex));
    
    if (newSecond !== this.time().seconds) {
      console.log('📜 Scroll detected second:', newSecond);
      this.time.update(t => ({ ...t, seconds: newSecond }));
    }
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
          .querySelector('.digit-option.selected') as HTMLElement;
        if (minuteElement) {
          minuteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      if (this.secondsScrollRef) {
        const secondElement = this.secondsScrollRef.nativeElement
          .querySelector('.digit-option.selected') as HTMLElement;
        if (secondElement) {
          secondElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 50);
  }
}
