
import { Routes } from '@angular/router';
import { authGuard, publicPageGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/landing/landing').then(m => m.Landing),
  },
  {
    path: 'landing',
    loadComponent: () => import('./pages/landing/landing').then(m => m.Landing),
  },
  {
    path: 'login',
    canActivate: [publicPageGuard],
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
  },
  {
    path: 'signup',
    canActivate: [publicPageGuard],
    loadComponent: () => import('./pages/signup/signup').then(m => m.Signup),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard),
  },
  {
    path: 'activities',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/activities/activities').then(m => m.ActivitiesPage),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/settings/settings').then(m => m.Settings),
  },
  {
    path: 'report',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/report/report').then(m => m.Report),
  },
  {
    path: 'activities/:activityTitle/sessions',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/sessions-list/sessions-list').then(m => m.SessionsListComponent),
  },
  {
    path: 'activities/:activityTitle/sessions/:sessionId',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/session-timer/session-timer').then(m => m.SessionTimerComponent),
  },
  {
    path: 'oauth2/redirect',
    loadComponent: () => import('./pages/landing/landing').then(m => m.Landing),
  },
];
