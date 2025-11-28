import { Routes } from '@angular/router';

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
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
  },
  {
    path: 'signup',
    loadComponent: () => import('./pages/signup/signup').then(m => m.Signup),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard),
  },
  {
    path: 'activities',
    loadComponent: () => import('./pages/activities/activities').then(m => m.ActivitiesPage),
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings').then(m => m.Settings),
  },
  {
    path: 'help',
    loadComponent: () => import('./pages/help/help').then(m => m.HelpPage),
  },
  {
    path: 'report',
    loadComponent: () => import('./pages/report/report').then(m => m.Report),
  }
];
