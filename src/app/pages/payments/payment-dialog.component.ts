import { Component, inject, Inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { combineLatest, Subscription } from 'rxjs';
import { Player } from '../../models/player.model';
import { PaymentService } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';
import { Payment, WEEKLY_FEE, DEFAULT_SEASON_START, getWeeksOwed } from '../../models/payment.model';

@Component({
  selector: 'app-payment-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatDividerModule, MatSnackBarModule,
    MatDatepickerModule, MatNativeDateModule,
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon>payments</mat-icon>
      Pagos — {{ player.name }}
      <span class="player-num">#{{ player.number }}</span>
    </h2>

    <mat-dialog-content>
      <!-- Status summary -->
      <div class="status-row">
        <div class="status-item">
          <div class="status-value">\${{ totalPaid() | number:'1.0-0' }}</div>
          <div class="status-label">Total Pagado</div>
        </div>
        <div class="status-item">
          <div class="status-value">{{ weeksPaid() }} / {{ weeksOwed() }}</div>
          <div class="status-label">Sem. Pagadas / Adeudadas</div>
        </div>
        <div class="status-item"
             [class.has-pending]="debtAmount() > 0"
             [class.has-credit]="debtAmount() === 0 && totalPaid() > 0">
          <div class="status-value">
            @if (debtAmount() > 0) {
              Debe \${{ debtAmount() }}
            } @else if (weeksAhead() > 0) {
              +{{ weeksAhead() }} sem.
            } @else {
              Al día
            }
          </div>
          <div class="status-label">Estado Temporada</div>
        </div>
      </div>

      <mat-divider></mat-divider>

      <!-- Add payment form -->
      <h3 class="section-title">Registrar nuevo pago</h3>
      <form [formGroup]="form" class="payment-form">
        <mat-form-field appearance="outline">
          <mat-label>Monto (DOP)</mat-label>
          <input matInput type="number" formControlName="amount" min="50" step="50">
          <span matSuffix>DOP</span>
          @if (form.get('amount')?.hasError('required') && form.get('amount')?.touched) {
            <mat-error>El monto es requerido</mat-error>
          }
          @if (form.get('amount')?.hasError('min') && form.get('amount')?.touched) {
            <mat-error>El monto debe ser mayor a 0</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Fecha</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="date" readonly>
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Nota (opcional)</mat-label>
          <input matInput formControlName="note" placeholder="Ej. Pago adelantado">
        </mat-form-field>

        <button
          mat-raised-button color="primary"
          [disabled]="form.invalid || saving()"
          (click)="addPayment()">
          <mat-icon>add</mat-icon> Agregar Pago
        </button>
      </form>

      <!-- Payment history -->
      @if (payments().length > 0) {
        <mat-divider></mat-divider>
        <h3 class="section-title">Historial de pagos</h3>
        <div class="history-list">
          @for (p of payments(); track p.id) {
            <div class="history-item">
              <div class="history-info">
                <span class="history-amount">+\${{ p.amount }} DOP</span>
                <span class="history-date">{{ p.date }}</span>
                @if (p.note) {
                  <span class="history-note">{{ p.note }}</span>
                }
                @if (p.registeredBy) {
                  <span class="history-registered">
                    <mat-icon>person</mat-icon>{{ p.registeredBy }}
                  </span>
                }
              </div>
              <button mat-icon-button color="warn" (click)="deletePayment(p)" title="Eliminar pago">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          }
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .player-num { color: #C62828; font-weight: 700; }

    .status-row {
      display: flex; gap: 8px; margin: 16px 0;
      justify-content: space-around; text-align: center;
    }
    .status-item { flex: 1; padding: 8px; background: #f8f9fa; border-radius: 8px; }
    .status-value { font-size: 1.2rem; font-weight: 700; color: #1A237E; }
    .status-item.has-pending .status-value { color: #C62828; }
    .status-item.has-credit .status-value { color: #2e7d32; }
    .status-label { font-size: 0.7rem; color: #888; margin-top: 2px; }

    .section-title { margin: 16px 0 10px; font-size: 0.9rem; color: #555; font-weight: 600; }

    .payment-form { display: flex; flex-direction: column; gap: 10px; min-width: 300px; }

    .history-list { max-height: 220px; overflow-y: auto; margin-top: 4px; }
    .history-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 6px 4px; border-bottom: 1px solid #f0f0f0;
    }
    .history-info { display: flex; flex-direction: column; gap: 2px; }
    .history-amount { font-weight: 700; color: #2e7d32; font-size: 0.95rem; }
    .history-date { font-size: 0.78rem; color: #888; }
    .history-note { font-size: 0.78rem; color: #aaa; font-style: italic; }
    .history-registered {
      display: flex; align-items: center; gap: 3px;
      font-size: 0.73rem; color: #1A237E;
    }
    .history-registered mat-icon { font-size: 12px; height: 12px; width: 12px; }
  `],
})
export class PaymentDialogComponent implements OnInit, OnDestroy {
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private sub?: Subscription;

  payments = signal<Payment[]>([]);
  seasonStartDate = signal<string>(DEFAULT_SEASON_START);
  saving = signal(false);

  seasonPayments = computed(() => this.payments().filter(p => p.date >= this.seasonStartDate()));
  weeksOwed = computed(() => getWeeksOwed(this.seasonStartDate()));
  totalOwed = computed(() => this.weeksOwed() * WEEKLY_FEE);

  totalPaid = computed(() => this.seasonPayments().reduce((s, p) => s + p.amount, 0));
  weeksPaid = computed(() => Math.floor(this.totalPaid() / WEEKLY_FEE));
  partialAmount = computed(() => this.totalPaid() % WEEKLY_FEE);
  debtAmount = computed(() => Math.max(0, this.totalOwed() - this.totalPaid()));
  weeksAhead = computed(() => this.totalPaid() > this.totalOwed() ? Math.floor((this.totalPaid() - this.totalOwed()) / WEEKLY_FEE) : 0);

  form = this.fb.group({
    amount: [50, [Validators.required, Validators.min(1)]],
    date: [new Date()],
    note: [''],
  });

  constructor(@Inject(MAT_DIALOG_DATA) public player: Player) {}

  ngOnInit() {
    this.sub = combineLatest([
      this.paymentService.getAllPayments(),
      this.paymentService.getSeasonConfig(),
    ]).subscribe(([allPayments, seasonStart]) => {
      this.payments.set(allPayments.filter(p => p.playerId === this.player.id));
      this.seasonStartDate.set(seasonStart);
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  async addPayment() {
    if (this.form.invalid) return;
    this.saving.set(true);
    try {
      const dateValue = this.form.value.date as Date;
      const y = dateValue.getFullYear();
      const m = String(dateValue.getMonth() + 1).padStart(2, '0');
      const d = String(dateValue.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      const note = this.form.value.note?.trim();
      const user = this.authService.currentUser();
      const registeredBy = user?.displayName || user?.email || 'Desconocido';
      const payload: Omit<Payment, 'id'> = {
        playerId: this.player.id!,
        playerName: this.player.name,
        playerNumber: this.player.number,
        amount: this.form.value.amount!,
        date: dateStr,
        registeredBy,
      };
      if (note) payload.note = note;
      await this.paymentService.addPayment(payload);
      this.form.patchValue({ amount: 50, date: new Date(), note: '' });
      this.snackBar.open('Pago registrado', 'OK', { duration: 2500 });
    } finally {
      this.saving.set(false);
    }
  }

  async deletePayment(payment: Payment) {
    if (!confirm(`¿Eliminar pago de $${payment.amount} DOP del ${payment.date}?`)) return;
    await this.paymentService.deletePayment(payment.id!);
    this.snackBar.open('Pago eliminado', 'OK', { duration: 2000 });
  }
}
