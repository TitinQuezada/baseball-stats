import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../services/auth.service';
import { ChangePasswordDialogComponent } from '../../pages/login/change-password-dialog.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule,
    MatIconModule, MatMenuModule, MatDialogModule, MatDividerModule,
  ],
  template: `
    <mat-toolbar class="navbar">
      <span class="brand">
        <mat-icon>sports_baseball</mat-icon>
        <span class="brand-text">Baseball Stats</span>
      </span>

      <nav class="nav-links">
        <a mat-button routerLink="/players" routerLinkActive="active-link">
          <mat-icon>group</mat-icon>
          <span class="nav-label">Jugadores</span>
        </a>
        <a mat-button routerLink="/games" routerLinkActive="active-link">
          <mat-icon>event</mat-icon>
          <span class="nav-label">Partidos</span>
        </a>
        <a mat-button routerLink="/stats" routerLinkActive="active-link">
          <mat-icon>bar_chart</mat-icon>
          <span class="nav-label">Estadísticas</span>
        </a>
        <a mat-button routerLink="/payments" routerLinkActive="active-link">
          <mat-icon>account_balance_wallet</mat-icon>
          <span class="nav-label">Fondo</span>
        </a>
      </nav>

      <button mat-icon-button class="user-btn" [matMenuTriggerFor]="userMenu">
        <mat-icon>account_circle</mat-icon>
      </button>

      <mat-menu #userMenu="matMenu" xPosition="before">
        <div class="menu-email">
          <mat-icon>email</mat-icon>
          {{ authService.currentUser()?.email }}
        </div>
        <mat-divider></mat-divider>
        <button mat-menu-item routerLink="/settings">
          <mat-icon>settings</mat-icon>
          Configuración
        </button>
        <button mat-menu-item (click)="openChangePassword()">
          <mat-icon>lock_reset</mat-icon>
          Cambiar contraseña
        </button>
        <button mat-menu-item (click)="logout()" class="logout-item">
          <mat-icon>logout</mat-icon>
          Cerrar sesión
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
  styles: [`
    .navbar {
      display: flex; align-items: center; padding: 0 16px;
      background: linear-gradient(135deg, #C62828 0%, #1A237E 100%) !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    }
    .brand {
      display: flex; align-items: center; gap: 10px;
      font-size: 1.25rem; font-weight: 700; margin-right: auto;
      color: white; letter-spacing: 0.5px;
    }
    .brand mat-icon { color: #EF5350; filter: drop-shadow(0 0 4px rgba(255,255,255,0.4)); }
    .nav-links { display: flex; gap: 4px; }
    .active-link {
      background: rgba(255,255,255,0.18) !important;
      border-radius: 6px;
      border-bottom: 2px solid #EF5350;
    }
    a { color: rgba(255,255,255,0.88) !important; font-weight: 500; }
    a mat-icon { font-size: 20px; height: 20px; width: 20px; }
    .nav-label { margin-left: 4px; }

    .user-btn { color: white !important; margin-left: 8px; }
    .user-btn mat-icon { font-size: 30px; height: 30px; width: 30px; }

    .menu-email {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px; font-size: 0.82rem;
      color: #555; pointer-events: none;
      max-width: 260px; overflow: hidden; text-overflow: ellipsis;
    }
    .menu-email mat-icon { font-size: 16px; height: 16px; width: 16px; flex-shrink: 0; }

    .logout-item { color: #C62828 !important; }
    .logout-item mat-icon { color: #C62828 !important; }

    @media (max-width: 480px) {
      .navbar { padding: 0 8px; }
      .brand-text { display: none; }
      .nav-label { display: none; }
      a mat-icon { font-size: 22px; height: 22px; width: 22px; }
    }
  `]
})
export class NavbarComponent {
  authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  openChangePassword() {
    this.dialog.open(ChangePasswordDialogComponent, { width: '400px' });
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
