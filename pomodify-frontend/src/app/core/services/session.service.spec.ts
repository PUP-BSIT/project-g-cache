import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SessionService, SessionResponse, PomodoroSession } from './session.service';
import { API } from '../config/api.config';

describe('SessionService', () => {
  let service: SessionService;
  let httpMock: HttpTestingController;

  const mockSession: PomodoroSession = {
    id: 1,
    activityId: 1,
    sessionType: 'CLASSIC',
    status: 'PENDING',
    focusTimeInMinutes: 25,
    breakTimeInMinutes: 5,
    cycles: 4,
    currentPhase: 'FOCUS',
    cyclesCompleted: 0,
    note: null
  };

  const mockResponse: SessionResponse = {
    message: 'Success',
    sessions: [mockSession],
    currentPage: 0,
    totalPages: 1,
    totalItems: 1
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SessionService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(SessionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create session', () => {
    service.createSession(1, {
      sessionType: 'CLASSIC',
      focusTimeInMinutes: 25,
      breakTimeInMinutes: 5,
      cycles: 4
    }).subscribe(session => {
      expect(session.id).toBe(1);
      expect(session.sessionType).toBe('CLASSIC');
    });

    const req = httpMock.expectOne(API.ACTIVITIES.SESSIONS.CREATE(1));
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should get sessions', () => {
    service.getSessions(1).subscribe(sessions => {
      expect(sessions.length).toBe(1);
      expect(sessions[0].status).toBe('PENDING');
    });

    const req = httpMock.expectOne(API.ACTIVITIES.SESSIONS.GET_ALL(1));
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should start session', () => {
    const startedSession = { ...mockSession, status: 'IN_PROGRESS' as const };
    const startResponse = { ...mockResponse, sessions: [startedSession] };

    service.startSession(1, 1).subscribe(session => {
      expect(session.status).toBe('IN_PROGRESS');
    });

    const req = httpMock.expectOne(API.ACTIVITIES.SESSIONS.START(1, 1));
    expect(req.request.method).toBe('POST');
    req.flush(startResponse);
  });

  it('should pause session', () => {
    const pausedSession = { ...mockSession, status: 'PAUSED' as const };
    const pauseResponse = { ...mockResponse, sessions: [pausedSession] };

    service.pauseSession(1, 1).subscribe(session => {
      expect(session.status).toBe('PAUSED');
    });

    const req = httpMock.expectOne(API.ACTIVITIES.SESSIONS.PAUSE(1, 1));
    expect(req.request.method).toBe('POST');
    req.flush(pauseResponse);
  });

  it('should complete phase', () => {
    service.completePhase(1, 1).subscribe(session => {
      expect(session).toBeTruthy();
    });

    const req = httpMock.expectOne(API.ACTIVITIES.SESSIONS.COMPLETE_PHASE(1, 1));
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });
});
