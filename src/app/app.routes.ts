import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/players', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'players',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/players/players.component').then(m => m.PlayersComponent)
  },
  {
    path: 'games',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/games/games.component').then(m => m.GamesComponent)
  },
  {
    path: 'games/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/game-detail/game-detail.component').then(m => m.GameDetailComponent)
  },
  {
    path: 'stats',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/stats/stats.component').then(m => m.StatsComponent)
  },
  {
    path: 'payments',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/payments/payments.component').then(m => m.PaymentsComponent)
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent)
  },
  {
    path: 'fondo',
    loadComponent: () => import('./pages/public-payments/public-payments.component').then(m => m.PublicPaymentsComponent)
  },
  { path: '**', redirectTo: '/players' }
];
