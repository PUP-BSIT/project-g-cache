import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DigitalClockPickerComponent } from './digital-clock-picker';

describe('DigitalClockPickerComponent', () => {
  let component: DigitalClockPickerComponent;
  let fixture: ComponentFixture<DigitalClockPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DigitalClockPickerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DigitalClockPickerComponent);
    component = fixture.componentInstance;
    
    // Set required input
    fixture.componentRef.setInput('time', { minutes: 25, seconds: 0 });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have minutes array from 0 to 60 by default (no constraints)', () => {
    expect(component.minutesRange().length).toBe(61);
    expect(component.minutesRange()[0]).toBe(0);
    expect(component.minutesRange()[60]).toBe(60);
  });

  it('should have seconds array from 0 to 59 by default (no constraints)', () => {
    expect(component.secondsRange().length).toBe(60);
    expect(component.secondsRange()[0]).toBe(0);
    expect(component.secondsRange()[59]).toBe(59);
  });

  it('should select minute', () => {
    component.selectMinute(30);
    expect(component.time().minutes).toBe(30);
  });

  it('should select second', () => {
    component.selectSecond(45);
    expect(component.time().seconds).toBe(45);
  });

  it('should be editable by default', () => {
    expect(component.isEditable()).toBeTrue();
  });

  describe('with constraints', () => {
    beforeEach(() => {
      // Set constraints for FOCUS phase: 5-90 minutes
      fixture.componentRef.setInput('constraints', { 
        minMinutes: 5, 
        maxMinutes: 90, 
        minSeconds: 0, 
        maxSeconds: 59 
      });
      fixture.detectChanges();
    });

    it('should limit minutes range based on constraints', () => {
      expect(component.minutesRange().length).toBe(86); // 90 - 5 + 1 = 86
      expect(component.minutesRange()[0]).toBe(5);
      expect(component.minutesRange()[85]).toBe(90);
    });

    it('should clamp minutes on blur when below minimum', () => {
      component.updateMinutes(2);
      component.finishEditMinutes();
      expect(component.time().minutes).toBe(5);
    });

    it('should clamp minutes on blur when above maximum', () => {
      component.updateMinutes(100);
      component.finishEditMinutes();
      expect(component.time().minutes).toBe(90);
    });

    it('should not clamp minutes when within valid range', () => {
      component.updateMinutes(45);
      component.finishEditMinutes();
      expect(component.time().minutes).toBe(45);
    });
  });

  describe('with BREAK constraints', () => {
    beforeEach(() => {
      // Set constraints for BREAK phase: 2-10 minutes
      fixture.componentRef.setInput('constraints', { 
        minMinutes: 2, 
        maxMinutes: 10, 
        minSeconds: 0, 
        maxSeconds: 59 
      });
      fixture.detectChanges();
    });

    it('should limit minutes range for break phase', () => {
      expect(component.minutesRange().length).toBe(9); // 10 - 2 + 1 = 9
      expect(component.minutesRange()[0]).toBe(2);
      expect(component.minutesRange()[8]).toBe(10);
    });
  });

  describe('with LONG_BREAK constraints', () => {
    beforeEach(() => {
      // Set constraints for LONG_BREAK phase: 15-30 minutes
      fixture.componentRef.setInput('constraints', { 
        minMinutes: 15, 
        maxMinutes: 30, 
        minSeconds: 0, 
        maxSeconds: 59 
      });
      fixture.detectChanges();
    });

    it('should limit minutes range for long break phase', () => {
      expect(component.minutesRange().length).toBe(16); // 30 - 15 + 1 = 16
      expect(component.minutesRange()[0]).toBe(15);
      expect(component.minutesRange()[15]).toBe(30);
    });
  });
});
