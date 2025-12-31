import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { DashboardService, DashboardMetrics } from './dashboard.service';
import { API } from '../config/api.config';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  const mockMetrics: DashboardMetrics = {
    currentStreak: 5,
    bestStreak: 10,
    totalActivities: 3,
    totalSessions: 25,
    focusHoursToday: 2.5,
    focusHoursThisWeek: 15,
    focusHoursAllTime: 100,
    recentSessions: []
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get dashboard metrics', () => {
    service.getDashboard().subscribe(metrics => {
      expect(metrics.currentStreak).toBe(5);
      expect(metrics.totalActivities).toBe(3);
      expect(metrics.focusHoursAllTime).toBe(100);
    });

    const req = httpMock.expectOne(API.DASHBOARD.GET_DATA);
    expect(req.request.method).toBe('GET');
    req.flush(mockMetrics);
  });

  it('should get user timezone', () => {
    const timezone = service.getUserTimezone();
    expect(timezone).toBeTruthy();
    expect(typeof timezone).toBe('string');
  });
});
