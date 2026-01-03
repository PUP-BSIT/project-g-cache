import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivityService, ActivityResponse } from './activity.service';
import { API } from '../config/api.config';

describe('ActivityService', () => {
  let service: ActivityService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ActivityService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(ActivityService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all activities', () => {
    const mockResponse: ActivityResponse = {
      message: 'Success',
      activities: [
        { activityId: 1, activityTitle: 'Test', activityDescription: 'Desc' }
      ],
      currentPage: 0,
      totalPages: 1,
      totalItems: 1
    };

    service.getAllActivities().subscribe(response => {
      expect(response.activities.length).toBe(1);
      expect(response.activities[0].activityTitle).toBe('Test');
    });

    const req = httpMock.expectOne(req => req.url.includes(API.ACTIVITIES.BASE));
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should create activity', () => {
    const mockResponse: ActivityResponse = {
      message: 'Created',
      activities: [{ activityId: 1, activityTitle: 'New', activityDescription: 'New Desc' }],
      currentPage: 0,
      totalPages: 1,
      totalItems: 1
    };

    service.createActivity({ title: 'New', description: 'New Desc' }).subscribe(activity => {
      expect(activity.activityTitle).toBe('New');
    });

    const req = httpMock.expectOne(API.ACTIVITIES.BASE);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should delete activity', () => {
    const mockResponse: ActivityResponse = {
      message: 'Deleted',
      activities: [{ activityId: 1, activityTitle: 'Deleted', activityDescription: '' }],
      currentPage: 0,
      totalPages: 1,
      totalItems: 0
    };

    service.deleteActivity(1).subscribe(activity => {
      expect(activity.activityId).toBe(1);
    });

    const req = httpMock.expectOne(`${API.ACTIVITIES.BASE}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(mockResponse);
  });
});
