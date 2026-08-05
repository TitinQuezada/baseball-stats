import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatDividerModule,
  ],
  template: `
    <div class="login-bg">
      <div class="login-wrapper">

        <div class="login-brand">
          <mat-icon class="brand-icon">sports_baseball</mat-icon>
          <h1>Baseball Stats</h1>
          <p>Sistema de estadísticas del equipo</p>
        </div>

        <mat-card class="login-card">
          <mat-card-content>
            <h2>Iniciar Sesión</h2>


            <div class="divider-row">
              <mat-divider></mat-divider>
              <span class="divider-label">o</span>
              <mat-divider></mat-divider>
            </div>

            <!-- Email/password form -->
            <form [formGroup]="form" (ngSubmit)="submit()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Correo electrónico</mat-label>
                <mat-icon matPrefix>email</mat-icon>
                <input matInput formControlName="email" type="email" autocomplete="email">
                @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
                  <mat-error>El correo es requerido</mat-error>
                }
                @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
                  <mat-error>Correo inválido</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Contraseña</mat-label>
                <mat-icon matPrefix>lock</mat-icon>
                <input matInput formControlName="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  autocomplete="current-password">
                <button matSuffix mat-icon-button type="button"
                  (click)="showPassword.set(!showPassword())">
                  <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
                  <mat-error>La contraseña es requerida</mat-error>
                }
              </mat-form-field>

              @if (errorMsg()) {
                <div class="error-banner">
                  <mat-icon>error_outline</mat-icon>
                  {{ errorMsg() }}
                </div>
              }

              <button mat-raised-button color="primary" class="submit-btn"
                type="submit" [disabled]="loading()">
                @if (loadingEmail()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <mat-icon>login</mat-icon>
                  Ingresar
                }
              </button>

               <!-- Google button -->
            <button class="google-btn" (click)="submitGoogle()" [disabled]="loading()">
              @if (loadingGoogle()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <svg class="google-icon" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar con Google
              }
            </button>
            </form>

          </mat-card-content>
        </mat-card>

      </div>
    </div>
  `,
  styles: [`
    .login-bg {
      min-height: 100vh;
      background: linear-gradient(135deg, #C62828 0%, #1A237E 100%);
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
    }

    .login-wrapper {
      width: 100%; max-width: 400px;
      display: flex; flex-direction: column; align-items: center; gap: 24px;
    }

    .login-brand { text-align: center; color: white; }
    .brand-icon {
      font-size: 64px; height: 64px; width: 64px; color: #EF5350;
      filter: drop-shadow(0 2px 8px rgba(0,0,0,0.4));
    }
    .login-brand h1 { margin: 8px 0 4px; font-size: 2rem; font-weight: 800; letter-spacing: 1px; }
    .login-brand p  { margin: 0; font-size: 0.9rem; opacity: 0.8; }

    .login-card {
      width: 100%;
      border-radius: 16px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3) !important;
    }

    h2 { margin: 0 0 20px; font-size: 1.3rem; font-weight: 700; color: #1A1A1A; text-align: center; }

    /* Google button */
    .google-btn {
      width: 100%; height: 48px;
      display: flex; align-items: center; justify-content: center; gap: 12px;
      background: white; color: #3c4043;
      border: 1.5px solid #dadce0; border-radius: 8px;
      font-size: 0.95rem; font-weight: 600; cursor: pointer;
      transition: background 0.15s, box-shadow 0.15s;
      font-family: inherit;
      margin-top: 0.5rem;
    }
    .google-btn:hover:not(:disabled) {
      background: #f8f9fa;
      box-shadow: 0 1px 6px rgba(0,0,0,0.15);
    }
    .google-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .google-icon { width: 20px; height: 20px; flex-shrink: 0; }

    /* Divider */
    .divider-row {
      display: flex; align-items: center; gap: 12px;
      margin: 20px 0 16px;
    }
    .divider-row mat-divider { flex: 1; }
    .divider-label { font-size: 0.82rem; color: #aaa; white-space: nowrap; }

    .full-width { width: 100%; margin-bottom: 4px; }

    .error-banner {
      display: flex; align-items: center; gap: 8px;
      background: #FFEBEE; color: #C62828;
      border: 1px solid #EF9A9A;
      border-radius: 8px; padding: 10px 14px;
      font-size: 0.88rem; margin-bottom: 12px;
    }
    .error-banner mat-icon { font-size: 18px; height: 18px; width: 18px; flex-shrink: 0; }

    .submit-btn {
      width: 100%; height: 48px;
      font-size: 1rem; font-weight: 600;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
  `]
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router      = inject(Router);
  private fb          = inject(FormBuilder);

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  showPassword  = signal(false);
  loadingEmail  = signal(false);
  loadingGoogle = signal(false);
  errorMsg      = signal('');

  loading = () => this.loadingEmail() || this.loadingGoogle();

  async submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loadingEmail.set(true);
    this.errorMsg.set('');
    try {
      const { email, password } = this.form.value;
      await this.authService.login(email!, password!);
      this.router.navigate(['/players']);
    } catch (err: any) {
      this.errorMsg.set(this.friendlyError(err.code));
    } finally {
      this.loadingEmail.set(false);
    }
  }

  async submitGoogle() {
    this.loadingGoogle.set(true);
    this.errorMsg.set('');
    try {
      await this.authService.loginWithGoogle();
      this.router.navigate(['/players']);
    } catch (err: any) {
      this.errorMsg.set(this.friendlyError(err.code));
    } finally {
      this.loadingGoogle.set(false);
    }
  }

  private friendlyError(code: string): string {
    const map: Record<string, string> = {
      'auth/not-authorized':         'Este correo no está autorizado para acceder.',
      'auth/invalid-credential':     'Correo o contraseña incorrectos.',
      'auth/user-not-found':         'No existe una cuenta con ese correo.',
      'auth/wrong-password':         'Contraseña incorrecta.',
      'auth/too-many-requests':      'Demasiados intentos. Intenta más tarde.',
      'auth/user-disabled':          'Esta cuenta ha sido deshabilitada.',
      'auth/popup-closed-by-user':   'Se cerró la ventana de Google.',
      'auth/network-request-failed': 'Error de red. Verifica tu conexión.',
    };
    return map[code] ?? 'Ocurrió un error. Intenta de nuevo.';
  }
}
