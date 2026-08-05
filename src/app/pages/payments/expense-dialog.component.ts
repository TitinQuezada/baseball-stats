import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-expense-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Registrar Gasto del Fondo</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline">
          <mat-label>Monto (DOP)</mat-label>
          <input matInput type="number" formControlName="amount" min="1">
          <span matSuffix>DOP</span>
          @if (form.get('amount')?.hasError('required') && form.get('amount')?.touched) {
            <mat-error>El monto es requerido</mat-error>
          }
          @if (form.get('amount')?.hasError('min') && form.get('amount')?.touched) {
            <mat-error>El monto debe ser mayor a 0</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Razón / Descripción</mat-label>
          <input matInput formControlName="reason" placeholder="Ej. Compra de pelotas">
          @if (form.get('reason')?.hasError('required') && form.get('reason')?.touched) {
            <mat-error>La razón es requerida</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Fecha</mat-label>
          <input matInput type="date" formControlName="date">
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="warn" [disabled]="form.invalid" (click)="save()">
        Registrar Gasto
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; min-width: 320px; }
  `],
})
export class ExpenseDialogComponent {
  private fb = inject(FormBuilder);
  private ref = inject(MatDialogRef<ExpenseDialogComponent>);

  form = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    reason: ['', Validators.required],
    date: [new Date().toISOString().split('T')[0]],
  });

  save() {
    if (this.form.invalid) return;
    this.ref.close(this.form.value);
  }
}
