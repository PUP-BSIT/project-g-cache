import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router'; // <--- 1. Import this
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { authErrorInterceptor } from './core/interceptors/auth-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    
    // 2. Add 'withComponentInputBinding()' here:
    provideRouter(routes, withComponentInputBinding()), 
    
    provideClientHydration(withEventReplay()),
    provideAnimations(),
    provideAnimationsAsync(),
    provideHttpClient(
      withFetch(), 
      withInterceptors([
        authTokenInterceptor,
        authErrorInterceptor
      ])
    )
  ]
};