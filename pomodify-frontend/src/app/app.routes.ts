
import { Routes } from '@angular/router';
import { authGuard, publicPageGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [publicPageGuard],
    loadComponent: () => import('./pages/landing/landing').then(m => m.Landing),
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin-login/admin-login').then(m => m.AdminLogin),
  },
  {
    path: 'admin/dashboard',
    loadComponent: () => import('./pages/admin/admin-dashboard/admin-dashboard').then(m => m.AdminDashboard),
  },
  {
    path: 'landing',
    loadComponent: () => import('./pages/landing/landing').then(m => m.Landing),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
  },
  {
    path: 'signup',
    loadComponent: () => import('./pages/signup/signup').then(m => m.Signup),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./pages/reset-password/reset-password').then(m => m.ResetPasswordPage),
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
    path: 'privacy',
    loadComponent: () => import('./pages/privacy/privacy').then(m => m.PrivacyComponent),
  },
  {
    path: 'terms',
    loadComponent: () => import('./pages/terms/terms').then(m => m.TermsComponent),
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/static-page/static-page').then(m => m.StaticPage),
  },
  {
    path: 'overview',
    loadComponent: () => import('./pages/static-page/static-page').then(m => m.StaticPage),
  },
  {
    path: 'docs',
    loadComponent: () => import('./pages/static-page/static-page').then(m => m.StaticPage),
  },
  {
    path: 'support',
    loadComponent: () => import('./pages/static-page/static-page').then(m => m.StaticPage),
  },
  {
    path: 'release-notes',
    loadComponent: () => import('./pages/static-page/static-page').then(m => m.StaticPage),
  },
  {
    path: 'careers',
    loadComponent: () => import('./pages/static-page/static-page').then(m => m.StaticPage),
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/contact/contact').then(m => m.ContactPage),
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
    path: 'verify',
    loadComponent: () => import('./verify/verify.component').then(m => m.VerifyComponent),
  },
  {
    path: 'oauth2/redirect',
    loadComponent: () => import('./pages/landing/landing').then(m => m.Landing),
  },
];
