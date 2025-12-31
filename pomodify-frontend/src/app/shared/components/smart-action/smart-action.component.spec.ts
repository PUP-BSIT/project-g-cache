import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SmartActionComponent } from './smart-action.component';

describe('SmartActionComponent', () => {
  let component: SmartActionComponent;
  let fixture: ComponentFixture<SmartActionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SmartActionComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SmartActionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with menu closed', () => {
    expect(component.open).toBeFalse();
  });

  it('should open menu', () => {
    component.openMenu();
    expect(component.open).toBeTrue();
  });

  it('should close menu', () => {
    component.openMenu();
    component.closeMenu();
    expect(component.open).toBeFalse();
  });

  it('should emit action and close menu on select', () => {
    spyOn(component.actionSelected, 'emit');
    component.openMenu();
    component.select('wizard');
    expect(component.actionSelected.emit).toHaveBeenCalledWith('wizard');
    expect(component.open).toBeFalse();
  });

  it('should emit quick action', () => {
    spyOn(component.actionSelected, 'emit');
    component.select('quick');
    expect(component.actionSelected.emit).toHaveBeenCalledWith('quick');
  });

  it('should emit custom action', () => {
    spyOn(component.actionSelected, 'emit');
    component.select('custom');
    expect(component.actionSelected.emit).toHaveBeenCalledWith('custom');
  });
});
