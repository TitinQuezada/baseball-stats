import { Component, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Player, POSITIONS } from '../../models/player.model';

@Component({
  selector: 'app-player-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatSlideToggleModule,
    MatDatepickerModule, MatNativeDateModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar Jugador' : 'Nuevo Jugador' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name" placeholder="Ej. Juan Pérez">
          @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
            <mat-error>El nombre es requerido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Número</mat-label>
          <input matInput type="number" formControlName="number" min="0" max="99">
          @if (form.get('number')?.hasError('required') && form.get('number')?.touched) {
            <mat-error>El número es requerido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Posición</mat-label>
          <mat-select formControlName="position">
            @for (pos of positions; track pos.value) {
              <mat-option [value]="pos.value">{{ pos.value }} – {{ pos.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Teléfono (WhatsApp)</mat-label>
          <input matInput formControlName="phone" placeholder="18091234567 (código país + número)">
          @if (form.get('phone')?.hasError('pattern') && form.get('phone')?.touched) {
            <mat-error>Solo dígitos, incluyendo código de país (10 a 15 dígitos)</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Jugador desde</mat-label>
          <input matInput [matDatepicker]="joinedPicker" formControlName="joinedAt" readonly>
          <mat-datepicker-toggle matIconSuffix [for]="joinedPicker"></mat-datepicker-toggle>
          <mat-datepicker #joinedPicker></mat-datepicker>
          <mat-hint>Desde cuándo debe cuota. Vacío = desde el inicio de temporada</mat-hint>
        </mat-form-field>

        <mat-slide-toggle formControlName="active" color="primary">
          Jugador Activo
        </mat-slide-toggle>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid" (click)="save()">
        Guardar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; min-width: 320px; }
  `]
})
export class PlayerDialogComponent {
  private fb = inject(FormBuilder);
  private ref = inject(MatDialogRef<PlayerDialogComponent>);

  positions = POSITIONS;
  form: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: Player | null) {
    this.form = this.fb.group({
      name: [data?.name ?? '', Validators.required],
      number: [data?.number ?? null, Validators.required],
      position: [data?.position ?? 'P', Validators.required],
      phone: [data?.phone ?? '', Validators.pattern(/^\d{10,15}$/)],
      // Jugador nuevo: hoy por defecto (debe cuota desde que se agrega, no desde el inicio de temporada).
      // Edicion de jugador existente sin fecha: se deja vacio, no se asume "hoy".
      joinedAt: [data ? this.parseDate(data.joinedAt) : new Date()],
      active: [data?.active ?? true],
    });
  }

  private parseDate(dateStr?: string): Date | null {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  save() {
    if (this.form.invalid) return;
    const result: any = { ...this.form.value };
    const joinedAt = this.form.value.joinedAt as Date | null;
    if (joinedAt) {
      result.joinedAt = this.formatDate(joinedAt);
    } else {
      delete result.joinedAt;
    }
    if (this.data?.id) result.id = this.data.id;
    this.ref.close(result);
  }
}
