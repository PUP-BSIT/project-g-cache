import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { smartAuthInterceptor } from './core/interceptors/smart-auth.interceptor';
import { mockActivityInterceptor } from './core/interceptors/mock-activity.interceptor';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { authErrorInterceptor } from './core/interceptors/auth-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideAnimations(),
    provideAnimationsAsync(),
    // Order matters: 
    // 1. authTokenInterceptor - adds Authorization header
    // 2. mockActivityInterceptor - provides mock data for activities (dev)
    // 3. smartAuthInterceptor - provides mock auth for login/register (dev)
    // 4. authErrorInterceptor - handles 401 errors and token refresh (must be last)
    provideHttpClient(
      withFetch(), 
      withInterceptors([
        authTokenInterceptor, 
        mockActivityInterceptor, 
        smartAuthInterceptor,
        authErrorInterceptor
      ])
    )
  ]
};