import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Dashboard } from './dashboard';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockDialog.open.and.returnValue({ afterClosed: () => of(null) } as any);

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MatDialog, useValue: mockDialog }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have sidebar expanded by default', () => {
    expect((component as any).sidebarExpanded()).toBe(true);
  });

  it('should toggle sidebar', () => {
    (component as any).toggleSidebar();
    expect((component as any).sidebarExpanded()).toBe(false);
  });

  it('should format relative time correctly', () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    expect((component as any).getRelativeTime(twoHoursAgo)).toBe('2h ago');
  });

  it('should return "Just now" for very recent timestamps', () => {
    const now = new Date().toISOString();
    expect((component as any).getRelativeTime(now)).toBe('Just now');
  });

  it('should have default metrics as null', () => {
    expect((component as any).dashboardMetrics()).toBeNull();
  });

  it('should compute current streak as 0 when no metrics', () => {
    expect((component as any).currentStreak()).toBe(0);
  });

  it('should compute total activities as 0 when no metrics', () => {
    expect((component as any).totalActivities()).toBe(0);
  });

  it('should open create activity modal', () => {
    (component as any).openCreateActivityModal();
    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('should open profile modal', () => {
    (component as any).openProfileModal();
    expect(mockDialog.open).toHaveBeenCalled();
  });
});
