import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Footer } from './footer';
import { provideRouter } from '@angular/router';

describe('Footer', () => {
  let component: Footer;
  let fixture: ComponentFixture<Footer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Footer],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(Footer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return current year', () => {
    expect(component.year).toBe(new Date().getFullYear());
  });

  it('should start with modal closed', () => {
    expect(component.modalOpen).toBeFalse();
  });

  it('should open modal', () => {
    component.openModal('privacy');
    expect(component.modalOpen).toBeTrue();
    expect(component.modalTitle).toBe('Privacy Policy');
  });

  it('should close modal', () => {
    component.openModal('privacy');
    component.closeModal();
    expect(component.modalOpen).toBeFalse();
    expect(component.modalContent).toBe('');
  });

  it('should handle escape key to close modal', () => {
    component.openModal('privacy');
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    component.handleKeydown(event);
    expect(component.modalOpen).toBeFalse();
  });

  it('should set correct title for terms', () => {
    component.openModal('terms');
    expect(component.modalTitle).toBe('Terms of Service');
  });

  it('should set correct title for about', () => {
    component.openModal('about');
    expect(component.modalTitle).toBe('About Pomodify');
  });
});
