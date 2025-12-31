import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivitiesPage } from './activities';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

describe('ActivitiesPage', () => {
  let component: ActivitiesPage;
  let fixture: ComponentFixture<ActivitiesPage>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockDialog.open.and.returnValue({ afterClosed: () => of(null) } as any);

    await TestBed.configureTestingModule({
      imports: [ActivitiesPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MatDialog, useValue: mockDialog }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ActivitiesPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have sidebar expanded by default', () => {
    expect((component as any).sidebarExpanded()).toBe(true);
  });

  it('should toggle sidebar', () => {
    expect((component as any).sidebarExpanded()).toBe(true);
    (component as any).toggleSidebar();
    expect((component as any).sidebarExpanded()).toBe(false);
  });

  it('should format relative time correctly', () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    expect((component as any).getRelativeTime(fiveMinutesAgo)).toBe('5m ago');
  });

  it('should return "Just now" for recent timestamps', () => {
    const now = new Date().toISOString();
    expect((component as any).getRelativeTime(now)).toBe('Just now');
  });

  it('should open create activity modal', () => {
    (component as any).openCreateActivityModal();
    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('should initialize with empty activities', () => {
    expect((component as any).activities().length).toBe(0);
  });

  it('should have pagination starting at page 1', () => {
    expect((component as any).currentPage()).toBe(1);
  });
});
