import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Mock data storage (simulates a database)
let mockActivities: any[] = [
  {
    activityId: 1,
    activityTitle: 'Learn Angular',
    activityDescription: 'Master Angular framework and build amazing apps',
    categoryId: 1,
    categoryName: 'Programming',
    colorTag: 'blue',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    sessions: [
      {
        id: '1',
        focusTimeMinutes: 25,
        breakTimeMinutes: 5,
        note: 'First session',
        createdAt: new Date(Date.now() - 3600000).toISOString()
      }
    ]
  },
  {
    activityId: 2,
    activityTitle: 'Design UI/UX',
    activityDescription: 'Create beautiful user interfaces',
    categoryId: 2,
    categoryName: 'Design',
    colorTag: 'purple',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    sessions: []
  }
];

let nextActivityId = 3;
let nextSessionId = 2;

export const mockActivityInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url;

  // Only intercept API calls
  if (!url.includes('/api/v1')) {
    return next(req);
  }

  // Respect environment flag to disable mocks
  if (!environment.useMockBackend) {
    return next(req);
  }

  console.log('🎭 Mock Interceptor:', req.method, url);

  // GET all activities
  if (req.method === 'GET' && url.includes('/api/v1/activities') && !url.match(/\/\d+$/)) {
    return of(new HttpResponse({
      status: 200,
      body: {
        message: 'Active activities fetched successfully.',
        activities: mockActivities,
        currentPage: 0,
        totalPages: 1,
        totalItems: mockActivities.length,
      }
    })).pipe(delay(300));
  }

  // GET single activity
  if (req.method === 'GET' && url.match(/\/api\/v1\/activities\/\d+$/)) {
    const id = parseInt(url.split('/').pop() || '0');
    const activity = mockActivities.find(a => a.activityId === id);
    
    if (activity) {
      return of(new HttpResponse({
        status: 200,
        body: {
          message: 'Activity fetched successfully',
          activities: [activity],
          currentPage: 0,
          totalPages: 1,
          totalItems: 1,
        }
      })).pipe(delay(200));
    }
    return throwError(() => ({ status: 404, message: 'Activity not found' }));
  }

  // POST create activity
  if (req.method === 'POST' && url.includes('/api/v1/activities') && !url.includes('/sessions')) {
    const body = req.body as any;
    const newActivity = {
      activityId: nextActivityId++,
      activityTitle: body.title,
      activityDescription: body.description || '',
      categoryId: body.categoryId || (mockActivities.length + 1),
      categoryName: 'General',
      colorTag: 'teal',
      createdAt: new Date().toISOString(),
      sessions: []
    };
    
    mockActivities.push(newActivity);
    
    console.log('✅ Created mock activity:', newActivity);
    
    return of(new HttpResponse({
      status: 201,
      body: {
        message: 'Activity created successfully',
        activities: [newActivity],
        currentPage: 0,
        totalPages: 1,
        totalItems: 1,
      }
    })).pipe(delay(400));
  }

  // PUT update activity
  if (req.method === 'PUT' && url.match(/\/api\/v1\/activities\/\d+$/)) {
    const id = parseInt(url.split('/').pop() || '0');
    const index = mockActivities.findIndex(a => a.activityId === id);
    const body = req.body as any;
    
    if (index !== -1) {
      mockActivities[index] = {
        ...mockActivities[index],
        activityTitle: body.newActivityTitle || mockActivities[index].activityTitle,
        activityDescription: body.newActivityDescription || mockActivities[index].activityDescription,
        categoryId: body.newCategoryId || mockActivities[index].categoryId,
      };
      
      return of(new HttpResponse({
        status: 200,
        body: {
          message: 'Activity updated successfully',
          activities: [mockActivities[index]],
          currentPage: 0,
          totalPages: 1,
          totalItems: 1,
        }
      })).pipe(delay(300));
    }
    return throwError(() => ({ status: 404, message: 'Activity not found' }));
  }

  // DELETE activity
  if (req.method === 'DELETE' && url.match(/\/api\/v1\/activities\/\d+$/)) {
    const id = parseInt(url.split('/').pop() || '0');
    const index = mockActivities.findIndex(a => a.activityId === id);
    
    if (index !== -1) {
      const deleted = mockActivities.splice(index, 1);
      return of(new HttpResponse({
        status: 200,
        body: {
          message: 'Activity deleted successfully',
          activities: deleted,
          currentPage: 0,
          totalPages: 1,
          totalItems: 1,
        }
      })).pipe(delay(200));
    }
    return throwError(() => ({ status: 404, message: 'Activity not found' }));
  }

  // POST create session
  if (req.method === 'POST' && url.includes('/sessions')) {
    const activityId = parseInt(url.split('/')[4]);
    const activity = mockActivities.find(a => a.activityId === activityId);
    const body = req.body as any;
    
    if (activity) {
      const newSession = {
        id: String(nextSessionId++),
        focusTimeMinutes: body.focusTimeMinutes,
        breakTimeMinutes: body.breakTimeMinutes,
        note: body.note || '',
        createdAt: new Date().toISOString()
      };
      
      activity.sessions.push(newSession);
      
      return of(new HttpResponse({
        status: 201,
        body: newSession
      })).pipe(delay(300));
    }
    return throwError(() => ({ status: 404, message: 'Activity not found' }));
  }

  // DELETE session
  if (req.method === 'DELETE' && url.includes('/sessions/')) {
    const parts = url.split('/');
    const activityId = parseInt(parts[4]);
    const sessionId = parts[6];
    
    const activity = mockActivities.find(a => a.activityId === activityId);
    
    if (activity) {
      const sessionIndex = activity.sessions.findIndex((s: any) => s.id === sessionId);
      if (sessionIndex !== -1) {
        activity.sessions.splice(sessionIndex, 1);
        return of(new HttpResponse({
          status: 204,
          body: null
        })).pipe(delay(200));
      }
    }
    return throwError(() => ({ status: 404, message: 'Session not found' }));
  }

  // GET dashboard
  if (req.method === 'GET' && url.includes('/api/v1/dashboard')) {
    const recent = mockActivities.slice(0, 3).map(a => ({
      activityId: a.activityId,
      activityTitle: a.activityTitle,
      lastSession: a.sessions[0] ? {
        sessionId: Number(a.sessions[0].id),
        startTime: new Date(Date.now() - 3600000).toISOString(),
        endTime: new Date().toISOString(),
        status: 'COMPLETED'
      } : {
        sessionId: 0,
        startTime: new Date(Date.now() - 3600000).toISOString(),
        endTime: new Date().toISOString(),
        status: 'COMPLETED'
      }
    }));

    const dashboardData = {
      totalCompletedSessions: mockActivities.reduce((sum, a) => sum + a.sessions.length, 0),
      totalFocusTime: mockActivities.reduce((sum, a) => sum + a.sessions.reduce((s: number, x: any) => s + (x.focusTimeMinutes * 60), 0), 0),
      weeklyFocusDistribution: {
        MONDAY: 7200,
        TUESDAY: 5400,
        WEDNESDAY: 9000,
        THURSDAY: 3600,
        FRIDAY: 10800,
        SATURDAY: 0,
        SUNDAY: 0,
      },
      recentActivities: recent,
    };
    
    return of(new HttpResponse({
      status: 200,
      body: dashboardData
    })).pipe(delay(300));
  }

  // If no mock matches, pass through to real backend
  console.log('⚠️ No mock for:', req.method, url, '- Passing to real backend');
  return next(req);
};
