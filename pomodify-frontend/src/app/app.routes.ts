import { Routes } from '@angular/router';
import { Landing } from './pages/landing/landing';

export const routes: Routes = [
    { path: '', pathMatch: 'full', component: Landing },
    { path: 'landing', component: Landing },
];
