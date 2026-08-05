import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const current = control.get('newPassword')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return current && confirm && current !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>lock_reset</mat-icon> Cambiar Contraseña
    </h2>

    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Contraseña actual</mat-label>
          <mat-icon matPrefix>lock</mat-icon>
          <input matInput formControlName="currentPassword"
            [type]="showCurrent() ? 'text' : 'password'">
          <button matSuffix mat-icon-button type="button"
            (click)="showCurrent.set(!showCurrent())">
            <mat-icon>{{ showCurrent() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          @if (form.get('currentPassword')?.hasError('required') && form.get('currentPassword')?.touched) {
            <mat-error>Requerido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nueva contraseña</mat-label>
          <mat-icon matPrefix>lock_open</mat-icon>
          <input matInput formControlName="newPassword"
            [type]="showNew() ? 'text' : 'password'">
          <button matSuffix mat-icon-button type="button"
            (click)="showNew.set(!showNew())">
            <mat-icon>{{ showNew() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          @if (form.get('newPassword')?.hasError('required') && form.get('newPassword')?.touched) {
            <mat-error>Requerido</mat-error>
          }
          @if (form.get('newPassword')?.hasError('minlength') && form.get('newPassword')?.touched) {
            <mat-error>Mínimo 6 caracteres</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Confirmar nueva contraseña</mat-label>
          <mat-icon matPrefix>lock_open</mat-icon>
          <input matInput formControlName="confirmPassword"
            [type]="showConfirm() ? 'text' : 'password'">
          <button matSuffix mat-icon-button type="button"
            (click)="showConfirm.set(!showConfirm())">
            <mat-icon>{{ showConfirm() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          @if (form.hasError('mismatch') && form.get('confirmPassword')?.touched) {
            <mat-error>Las contraseñas no coinciden</mat-error>
          }
        </mat-form-field>

        @if (errorMsg()) {
          <div class="error-banner">
            <mat-icon>error_outline</mat-icon>
            {{ errorMsg() }}
          </div>
        }
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cancelar</button>
      <button mat-raised-button color="primary" (click)="submit()" [disabled]="loading()">
        @if (loading()) {
          <mat-spinner diameter="18"></mat-spinner>
        } @else {
          <mat-icon>save</mat-icon> Guardar
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 { display: flex; align-items: center; gap: 8px; }
    mat-dialog-content { min-width: 320px; padding-top: 12px !important; }
    .full-width { width: 100%; margin-bottom: 4px; }
    .error-banner {
      display: flex; align-items: center; gap: 8px;
      background: #FFEBEE; color: #C62828;
      border: 1px solid #EF9A9A;
      border-radius: 8px; padding: 10px 14px;
      font-size: 0.88rem; margin-top: 4px;
    }
    .error-banner mat-icon { font-size: 18px; height: 18px; width: 18px; flex-shrink: 0; }
    mat-dialog-actions button { display: flex; align-items: center; gap: 6px; }
  `]
})
export class ChangePasswordDialogComponent {
  private authService = inject(AuthService);
  private dialogRef = inject(MatDialogRef<ChangePasswordDialogComponent>);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword:     ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  showCurrent = signal(false);
  showNew     = signal(false);
  showConfirm = signal(false);
  loading     = signal(false);
  errorMsg    = signal('');

  async submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set('');
    try {
      const { currentPassword, newPassword } = this.form.value;
      await this.authService.changePassword(currentPassword!, newPassword!);
      this.snackBar.open('Contraseña actualizada correctamente', 'OK', { duration: 3000 });
      this.dialogRef.close(true);
    } catch (err: any) {
      this.errorMsg.set(this.friendlyError(err.code));
    } finally {
      this.loading.set(false);
    }
  }

  private friendlyError(code: string): string {
    const map: Record<string, string> = {
      'auth/wrong-password':         'La contraseña actual es incorrecta.',
      'auth/invalid-credential':     'La contraseña actual es incorrecta.',
      'auth/too-many-requests':      'Demasiados intentos. Intenta más tarde.',
      'auth/network-request-failed': 'Error de red. Verifica tu conexión.',
    };
    return map[code] ?? 'Ocurrió un error. Intenta de nuevo.';
  }
}
