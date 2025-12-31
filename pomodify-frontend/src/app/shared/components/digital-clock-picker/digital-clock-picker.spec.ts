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

  it('should have minutes array from 0 to 60', () => {
    expect(component.minutes().length).toBe(61);
    expect(component.minutes()[0]).toBe(0);
    expect(component.minutes()[60]).toBe(60);
  });

  it('should have seconds array from 0 to 59', () => {
    expect(component.seconds().length).toBe(60);
    expect(component.seconds()[0]).toBe(0);
    expect(component.seconds()[59]).toBe(59);
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
});
