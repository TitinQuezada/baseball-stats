import { Component, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Game } from '../../models/game.model';

@Component({
  selector: 'app-game-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatButtonToggleModule, MatDatepickerModule, MatNativeDateModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar Partido' : 'Nuevo Partido' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Fecha</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="date">
          <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Rival</mat-label>
          <input matInput formControlName="opponent" placeholder="Nombre del equipo rival">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Temporada</mat-label>
          <input matInput formControlName="season" placeholder="Ej. 2025">
        </mat-form-field>

        <div class="score-row">
          <mat-form-field appearance="outline">
            <mat-label>Nuestras carreras</mat-label>
            <input matInput type="number" formControlName="teamScore" min="0">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Carreras rival</mat-label>
            <input matInput type="number" formControlName="opponentScore" min="0">
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Resultado</mat-label>
          <mat-select formControlName="result">
            <mat-option value="W">W – Victoria</mat-option>
            <mat-option value="L">L – Derrota</mat-option>
            <mat-option value="T">T – Empate</mat-option>
            <mat-option value="-">Pendiente</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="toggle-row">
          <span class="toggle-label">Nuestro equipo juega como:</span>
          <mat-button-toggle-group formControlName="isHomeTeam" class="home-toggle">
            <mat-button-toggle [value]="true">Local (batea en BAJA)</mat-button-toggle>
            <mat-button-toggle [value]="false">Visitante (batea en ALTA)</mat-button-toggle>
          </mat-button-toggle-group>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Notas (opcional)</mat-label>
          <textarea matInput formControlName="notes" rows="2"></textarea>
        </mat-form-field>
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
    .dialog-form { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; min-width: 380px; }
    .score-row { display: flex; gap: 12px; }
    .score-row mat-form-field { flex: 1; }
    .toggle-row { display: flex; flex-direction: column; gap: 6px; }
    .toggle-label { font-size: 0.82rem; color: #666; font-weight: 500; }
    .home-toggle { width: 100%; }
    .home-toggle mat-button-toggle { flex: 1; font-size: 0.82rem; }
  `]
})
export class GameDialogComponent {
  private fb = inject(FormBuilder);
  private ref = inject(MatDialogRef<GameDialogComponent>);
  form: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: Game | null) {
    this.form = this.fb.group({
      date: [data?.date ? new Date(data.date + 'T00:00:00') : new Date(), Validators.required],
      opponent: [data?.opponent ?? '', Validators.required],
      season: [data?.season ?? new Date().getFullYear().toString(), Validators.required],
      teamScore: [data?.teamScore ?? 0, Validators.required],
      opponentScore: [data?.opponentScore ?? 0, Validators.required],
      result: [data?.result ?? '-', Validators.required],
      isHomeTeam: [data?.isHomeTeam ?? true, Validators.required],
      notes: [data?.notes ?? ''],
    });
  }

  save() {
    if (this.form.invalid) return;
    const val = this.form.value;
    const result: any = {
      ...val,
      date: (() => { const d = val.date as Date; return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })(),
    };
    if (this.data?.id) result.id = this.data.id;
    this.ref.close(result);
  }
}
