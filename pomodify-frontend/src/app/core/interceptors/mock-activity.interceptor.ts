import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

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

  console.log('🎭 Mock Interceptor:', req.method, url);

  // GET all activities
  if (req.method === 'GET' && url.includes('/api/v1/activities') && !url.match(/\/\d+$/)) {
    return of(new HttpResponse({
      status: 200,
      body: mockActivities
    })).pipe(delay(300)); // Simulate network delay
  }

  // GET single activity
  if (req.method === 'GET' && url.match(/\/api\/v1\/activities\/\d+$/)) {
    const id = parseInt(url.split('/').pop() || '0');
    const activity = mockActivities.find(a => a.activityId === id);
    
    if (activity) {
      return of(new HttpResponse({
        status: 200,
        body: activity
      })).pipe(delay(200));
    }
    return throwError(() => ({ status: 404, message: 'Activity not found' }));
  }

  // POST create activity
  if (req.method === 'POST' && url.includes('/api/v1/activities') && !url.includes('/sessions')) {
    const body = req.body as any;
    const newActivity = {
      activityId: nextActivityId++,
      activityTitle: body.name,
      activityDescription: body.description || '',
      categoryId: mockActivities.length + 1,
      categoryName: body.category || 'General',
      colorTag: body.colorTag || 'teal',
      createdAt: new Date().toISOString(),
      sessions: []
    };
    
    mockActivities.push(newActivity);
    
    console.log('✅ Created mock activity:', newActivity);
    
    return of(new HttpResponse({
      status: 201,
      body: newActivity
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
        activityTitle: body.name || mockActivities[index].activityTitle,
        activityDescription: body.description || mockActivities[index].activityDescription,
        categoryName: body.category || mockActivities[index].categoryName,
        colorTag: body.colorTag || mockActivities[index].colorTag
      };
      
      return of(new HttpResponse({
        status: 200,
        body: mockActivities[index]
      })).pipe(delay(300));
    }
    return throwError(() => ({ status: 404, message: 'Activity not found' }));
  }

  // DELETE activity
  if (req.method === 'DELETE' && url.match(/\/api\/v1\/activities\/\d+$/)) {
    const id = parseInt(url.split('/').pop() || '0');
    const index = mockActivities.findIndex(a => a.activityId === id);
    
    if (index !== -1) {
      mockActivities.splice(index, 1);
      return of(new HttpResponse({
        status: 204,
        body: null
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
    const dashboardData = {
      totalActivities: mockActivities.length,
      totalSessions: mockActivities.reduce((sum, a) => sum + a.sessions.length, 0),
      recentActivities: mockActivities.slice(0, 3),
      weeklyStats: {
        hoursThisWeek: 12,
        streak: 3
      }
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
