import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/list-page.component').then(m => m.ListPageComponent)
  },
  {
    path: 'place/:id',
    loadComponent: () => import('./pages/detail-page.component').then(m => m.DetailPageComponent)
  }
];
