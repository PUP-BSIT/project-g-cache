import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SessionsListComponent } from './sessions-list';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

describe('SessionsListComponent', () => {
  let component: SessionsListComponent;
  let fixture: ComponentFixture<SessionsListComponent>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockDialog.open.and.returnValue({ afterClosed: () => of(null) } as any);

    await TestBed.configureTestingModule({
      imports: [SessionsListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MatDialog, useValue: mockDialog }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SessionsListComponent);
    component = fixture.componentInstance;
    
    // Set required input
    fixture.componentRef.setInput('activityTitle', 'Test Activity');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have activity title input', () => {
    expect(component.activityTitle()).toBe('Test Activity');
  });

  it('should start with loading state', () => {
    expect((component as any).loading()).toBe(true);
  });

  it('should have empty sessions initially', () => {
    expect((component as any).sessions().length).toBe(0);
  });

  it('should return correct status class for NOT_STARTED', () => {
    expect((component as any).getStatusClass('NOT_STARTED')).toBe('status-not-started');
  });

  it('should return correct status class for PENDING', () => {
    expect((component as any).getStatusClass('PENDING')).toBe('status-pending');
  });

  it('should return correct status class for IN_PROGRESS', () => {
    expect((component as any).getStatusClass('IN_PROGRESS')).toBe('status-in-progress');
  });

  it('should return correct status class for PAUSED', () => {
    expect((component as any).getStatusClass('PAUSED')).toBe('status-paused');
  });

  it('should return correct status class for COMPLETED', () => {
    expect((component as any).getStatusClass('COMPLETED')).toBe('status-completed');
  });

  it('should format date correctly', () => {
    const date = '2025-01-15T10:30:00Z';
    const formatted = (component as any).formatDate(date);
    expect(formatted).toContain('2025');
  });

  it('should return "Never" for undefined date', () => {
    expect((component as any).formatDate(undefined)).toBe('Never');
  });

  it('should get note text from string', () => {
    expect(component.getNoteText('Test note')).toBe('Test note');
  });

  it('should get note text from object', () => {
    expect(component.getNoteText({ text: 'Object note' })).toBe('Object note');
  });
});
