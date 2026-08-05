import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import * as XLSX from 'xlsx';
import { PlayerService } from '../../services/player.service';
import { PaymentService } from '../../services/payment.service';
import { Player } from '../../models/player.model';
import { Payment, FundExpense, WEEKLY_FEE, DEFAULT_SEASON_START, getWeeksOwed, computePlayerDebt } from '../../models/payment.model';
import { ExpenseDialogComponent } from './expense-dialog.component';

interface PlayerSummary {
  player: Player;
  payments: Payment[];
  totalPaid: number;
  weeksPaid: number;
  partialAmount: number;
  weeksOwed: number;
  totalOwed: number;
  debtAmount: number;
  weeksDebt: number;    // semanas que aún debe (weeksOwed - weeksPaid)
  weeksAhead: number;
}

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [
    CommonModule, MatTabsModule, MatCardModule, MatButtonModule,
    MatIconModule, MatDialogModule, MatSnackBarModule, MatDividerModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1><mat-icon>account_balance_wallet</mat-icon> Fondo &amp; Pagos</h1>
        <button mat-raised-button color="primary" (click)="exportExcel()">
          <mat-icon>download</mat-icon> Exportar Excel
        </button>
      </div>

      <!-- Summary cards -->
      <div class="summary-row">
        <mat-card class="summary-card income-card">
          <mat-card-content>
            <mat-icon>trending_up</mat-icon>
            <div class="summary-value">\${{ totalIncome() | number:'1.0-0' }} DOP</div>
            <div class="summary-label">Ingresos Totales</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="summary-card expense-card">
          <mat-card-content>
            <mat-icon>trending_down</mat-icon>
            <div class="summary-value">\${{ totalExpenses() | number:'1.0-0' }} DOP</div>
            <div class="summary-label">Gastos Totales</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="summary-card balance-card" [class.negative]="balance() < 0">
          <mat-card-content>
            <mat-icon>account_balance</mat-icon>
            <div class="summary-value">\${{ balance() | number:'1.0-0' }} DOP</div>
            <div class="summary-label">Balance del Fondo</div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Tabs -->
      <mat-tab-group animationDuration="150ms" class="tabs">

        <!-- Tab 1: Player summaries -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>group</mat-icon>&nbsp;Jugadores
          </ng-template>
          <div class="tab-content">
            <p class="tab-info">
              Cuota semanal: <strong>\${{ weeklyFee }} DOP</strong> &nbsp;·&nbsp;
              Semana <strong>{{ currentWeekNow() }}</strong> en curso &nbsp;·&nbsp;
              Semanas vencidas: <strong>{{ weeksOwedNow() }}</strong> &nbsp;·&nbsp;
              Deberían haber pagado <strong>\${{ totalOwedNow() }} DOP</strong>
            </p>
            <div class="players-grid">
              @for (s of playerSummaries(); track s.player.id) {
                <mat-card
                  class="pp-card"
                  [class.card-ok]="s.debtAmount === 0 && s.totalPaid > 0"
                  [class.card-critical]="s.weeksDebt >= 2"
                  [class.card-pending]="s.debtAmount > 0 && s.weeksDebt < 2"
                  [class.card-zero]="s.totalPaid === 0 && s.weeksDebt < 2">
                  <mat-card-content>
                    <div class="pp-header">
                      <span class="pp-badge">#{{ s.player.number }}</span>
                      <span class="pp-name">{{ s.player.name }}</span>
                    </div>
                    <mat-divider></mat-divider>
                    <div class="pp-stats">
                      <div class="pp-stat">
                        <div class="pp-val">\${{ s.totalPaid | number:'1.0-0' }}</div>
                        <div class="pp-lbl">Pagado</div>
                      </div>
                      <div class="pp-stat">
                        <div class="pp-val">{{ s.weeksPaid }}</div>
                        <div class="pp-lbl">Semanas</div>
                      </div>
                      <div class="pp-stat">
                        <div class="pp-val">{{ s.weeksDebt }}</div>
                        <div class="pp-lbl">Adeudadas</div>
                      </div>
                    </div>
                    @if (s.partialAmount > 0 && s.debtAmount === 0) {
                      <div class="pp-progress">
                        Semana en curso: \${{ s.partialAmount }} / \${{ weeklyFee }} DOP
                      </div>
                    }
                    <div class="pp-status"
                         [class.status-ok]="s.debtAmount === 0 && s.totalPaid > 0"
                         [class.status-critical]="s.weeksDebt >= 2"
                         [class.status-pending]="s.debtAmount > 0 && s.weeksDebt < 2"
                         [class.status-zero]="s.totalPaid === 0 && s.weeksDebt < 2">
                      @if (s.weeksDebt >= 2) {
                        <mat-icon>block</mat-icon> Sin derecho a juego
                      } @else if (s.totalPaid === 0) {
                        <mat-icon>cancel</mat-icon> Sin pagos
                      } @else if (s.debtAmount > 0) {
                        <mat-icon>warning</mat-icon> Debe \${{ s.debtAmount }} DOP
                      } @else if (s.weeksAhead > 0) {
                        <mat-icon>check_circle</mat-icon> Adelantado {{ s.weeksAhead }} sem.
                      } @else {
                        <mat-icon>check_circle</mat-icon> Al día
                      }
                    </div>
                    @if (s.weeksDebt >= 2) {
                      <div class="pp-to-play">
                        <mat-icon>payments</mat-icon>
                        Para jugar: \${{ (s.weeksDebt - 1) * weeklyFee }} DOP
                      </div>
                    }
                  </mat-card-content>
                </mat-card>
              }
              @if (playerSummaries().length === 0) {
                <div class="empty-state">
                  <mat-icon>group_off</mat-icon>
                  <p>No hay jugadores activos</p>
                </div>
              }
            </div>
          </div>
        </mat-tab>

        <!-- Tab 2: Payment history -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>receipt_long</mat-icon>&nbsp;Historial de Pagos
          </ng-template>
          <div class="tab-content">
            <div class="list-header">
              <span>{{ allPayments().length }} pago{{ allPayments().length !== 1 ? 's' : '' }} registrado{{ allPayments().length !== 1 ? 's' : '' }}</span>
            </div>
            <div class="data-list">
              @for (p of allPayments(); track p.id) {
                <div class="list-item">
                  <div class="li-body">
                    <div class="li-row1">
                      <span class="li-player">
                        {{ p.playerName }}
                        <span class="li-num">#{{ p.playerNumber }}</span>
                      </span>
                      <span class="li-amount income">+\${{ p.amount }} DOP</span>
                    </div>
                    <div class="li-row2">
                      <span class="li-date">{{ p.date }}</span>
                      @if (p.note) {
                        <span class="li-note">{{ p.note }}</span>
                      }
                      @if (p.registeredBy) {
                        <span class="li-registered">
                          <mat-icon>person</mat-icon>{{ p.registeredBy }}
                        </span>
                      }
                    </div>
                  </div>
                  <button mat-icon-button color="warn" (click)="deletePayment(p)" title="Eliminar pago">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              }
              @if (allPayments().length === 0) {
                <div class="empty-state">
                  <mat-icon>receipt_long</mat-icon>
                  <p>No hay pagos registrados aún</p>
                </div>
              }
            </div>
          </div>
        </mat-tab>

        <!-- Tab 3: Fund expenses -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>money_off</mat-icon>&nbsp;Gastos del Fondo
          </ng-template>
          <div class="tab-content">
            <div class="list-header">
              <span>{{ allExpenses().length }} gasto{{ allExpenses().length !== 1 ? 's' : '' }}</span>
              <button mat-raised-button color="warn" (click)="openExpenseDialog()">
                <mat-icon>remove_circle_outline</mat-icon> Registrar Gasto
              </button>
            </div>
            <div class="data-list">
              @for (e of allExpenses(); track e.id) {
                <div class="list-item">
                  <div class="li-body">
                    <div class="li-row1">
                      <span class="li-reason">{{ e.reason }}</span>
                      <span class="li-amount expense">-\${{ e.amount }} DOP</span>
                    </div>
                    <div class="li-row2">
                      <span class="li-date">{{ e.date }}</span>
                    </div>
                  </div>
                  <button mat-icon-button color="warn" (click)="deleteExpense(e)" title="Eliminar gasto">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              }
              @if (allExpenses().length === 0) {
                <div class="empty-state">
                  <mat-icon>money_off</mat-icon>
                  <p>No hay gastos registrados</p>
                </div>
              }
            </div>
          </div>
        </mat-tab>

      </mat-tab-group>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 1100px; margin: 0 auto; }
    .page-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
    }
    .page-header h1 { display: flex; align-items: center; gap: 8px; margin: 0; }

    /* Summary cards */
    .summary-row { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .summary-card {
      flex: 1; min-width: 150px; border-radius: 12px !important;
    }
    .summary-card mat-card-content {
      display: flex; flex-direction: column; align-items: center;
      gap: 4px; padding: 16px !important; text-align: center;
    }
    .summary-card mat-icon { font-size: 28px; height: 28px; width: 28px; }
    .summary-value { font-size: 1.3rem; font-weight: 700; }
    .summary-label { font-size: 0.72rem; color: #888; }

    .income-card { border-top: 4px solid #2e7d32 !important; }
    .income-card mat-icon, .income-card .summary-value { color: #2e7d32; }
    .expense-card { border-top: 4px solid #C62828 !important; }
    .expense-card mat-icon, .expense-card .summary-value { color: #C62828; }
    .balance-card { border-top: 4px solid #1A237E !important; }
    .balance-card mat-icon, .balance-card .summary-value { color: #1A237E; }
    .balance-card.negative { border-top-color: #C62828 !important; }
    .balance-card.negative mat-icon, .balance-card.negative .summary-value { color: #C62828; }

    /* Tabs */
    .tabs { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .tab-content { padding: 16px; }
    .tab-info { font-size: 0.85rem; color: #555; margin: 0 0 16px; }

    /* Players grid */
    .players-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }
    .pp-card { border-radius: 10px !important; border-top: 4px solid #bbb !important; }
    .pp-card.card-ok { border-top-color: #2e7d32 !important; }
    .pp-card.card-pending { border-top-color: #f57f17 !important; }
    .pp-card.card-zero { border-top-color: #C62828 !important; }
    .pp-card.card-critical { border-top-color: #C62828 !important; background: #fff5f5 !important; }

    .pp-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .pp-badge {
      background: #1A237E; color: white;
      padding: 2px 10px; border-radius: 12px; font-weight: 700; font-size: 0.82rem;
    }
    .pp-name { font-weight: 600; font-size: 0.92rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .pp-stats { display: flex; gap: 8px; margin: 10px 0; }
    .pp-stat { flex: 1; text-align: center; }
    .pp-val { font-size: 1.05rem; font-weight: 700; color: #1A237E; }
    .pp-lbl { font-size: 0.68rem; color: #888; }

    .pp-progress { font-size: 0.72rem; color: #f57f17; margin-bottom: 6px; text-align: center; }

    .pp-status {
      display: flex; align-items: center; gap: 4px;
      font-size: 0.8rem; font-weight: 600; justify-content: center;
    }
    .pp-status mat-icon { font-size: 16px; height: 16px; width: 16px; }
    .status-ok { color: #2e7d32; }
    .status-pending { color: #f57f17; }
    .status-zero { color: #C62828; }
    .status-critical { color: #C62828; font-weight: 700; }
    .pp-to-play {
      display: flex; align-items: center; justify-content: center; gap: 4px;
      margin-top: 6px; font-size: 0.78rem; font-weight: 700;
      color: #C62828; background: #fde8e8; border-radius: 6px; padding: 4px 8px;
    }
    .pp-to-play mat-icon { font-size: 14px; height: 14px; width: 14px; }

    /* List styles */
    .list-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 12px;
    }
    .list-header span { font-size: 0.85rem; color: #888; }

    .data-list { display: flex; flex-direction: column; }
    .list-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 4px; border-bottom: 1px solid #f0f0f0;
    }
    .li-body { flex: 1; }
    .li-row1 { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }
    .li-row2 { display: flex; gap: 12px; }
    .li-player { font-weight: 600; font-size: 0.92rem; }
    .li-num { color: #888; font-size: 0.82rem; margin-left: 2px; }
    .li-reason { font-weight: 600; font-size: 0.92rem; }
    .li-amount { font-weight: 700; font-size: 0.95rem; }
    .li-amount.income { color: #2e7d32; }
    .li-amount.expense { color: #C62828; }
    .li-date { font-size: 0.76rem; color: #888; }
    .li-note { font-size: 0.76rem; color: #aaa; font-style: italic; }
    .li-registered {
      display: flex; align-items: center; gap: 3px;
      font-size: 0.73rem; color: #1A237E;
    }
    .li-registered mat-icon { font-size: 12px; height: 12px; width: 12px; }

    .empty-state { text-align: center; padding: 48px 16px; color: #ccc; }
    .empty-state mat-icon { font-size: 48px; height: 48px; width: 48px; display: block; margin: 0 auto 12px; }

    @media (max-width: 600px) {
      .page-container { padding: 12px; }
      .summary-row { gap: 8px; }
      .summary-value { font-size: 1.05rem; }
    }
  `],
})
export class PaymentsComponent implements OnInit {
  private playerService = inject(PlayerService);
  private paymentService = inject(PaymentService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly weeklyFee = WEEKLY_FEE;

  private players = signal<Player[]>([]);
  allPayments = signal<Payment[]>([]);
  allExpenses = signal<FundExpense[]>([]);
  seasonStartDate = signal<string>(DEFAULT_SEASON_START);

  weeksOwedNow = computed(() => getWeeksOwed(this.seasonStartDate()));
  currentWeekNow = computed(() => this.weeksOwedNow() + 1);
  totalOwedNow = computed(() => this.weeksOwedNow() * WEEKLY_FEE);

  playerSummaries = computed<PlayerSummary[]>(() => {
    const allPayments = this.allPayments();
    const seasonStart = this.seasonStartDate();
    const weeksOwed = this.weeksOwedNow();
    return this.players()
      .filter(p => p.active)
      .map(p => {
        const playerPayments = allPayments.filter(pay => pay.playerId === p.id);
        // Solo pagos de la temporada actual para el control semanal
        const seasonPayments = playerPayments.filter(pay => pay.date >= seasonStart);
        const debt = computePlayerDebt(seasonPayments, weeksOwed, WEEKLY_FEE);
        return { player: p, payments: playerPayments, ...debt };
      })
      .sort((a, b) => {
        // 0 = al día/adelantado · 1 = con deuda · 2 = sin pagos
        const rank = (s: typeof a) => s.totalPaid === 0 ? 2 : s.debtAmount === 0 ? 0 : 1;
        const diff = rank(a) - rank(b);
        return diff !== 0 ? diff : a.player.number - b.player.number;
      });
  });

  // El balance del fondo usa TODOS los pagos, independiente de la temporada
  totalIncome = computed(() => this.allPayments().reduce((s, p) => s + p.amount, 0));
  totalExpenses = computed(() => this.allExpenses().reduce((s, e) => s + e.amount, 0));
  balance = computed(() => this.totalIncome() - this.totalExpenses());

  ngOnInit() {
    this.playerService.getAll().subscribe(p => this.players.set(p));
    this.paymentService.getAllPayments().subscribe(p => this.allPayments.set(p));
    this.paymentService.getAllExpenses().subscribe(e => this.allExpenses.set(e));
    this.paymentService.getSeasonConfig().subscribe(s => this.seasonStartDate.set(s));
  }

  openExpenseDialog() {
    const ref = this.dialog.open(ExpenseDialogComponent, { width: '420px' });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.paymentService.addExpense(result).then(() =>
        this.snackBar.open('Gasto registrado', 'OK', { duration: 2500 })
      );
    });
  }

  deletePayment(payment: Payment) {
    if (!confirm(`¿Eliminar pago de $${payment.amount} DOP de ${payment.playerName}?`)) return;
    this.paymentService.deletePayment(payment.id!).then(() =>
      this.snackBar.open('Pago eliminado', 'OK', { duration: 2500 })
    );
  }

  deleteExpense(expense: FundExpense) {
    if (!confirm(`¿Eliminar gasto "${expense.reason}" ($${expense.amount} DOP)?`)) return;
    this.paymentService.deleteExpense(expense.id!).then(() =>
      this.snackBar.open('Gasto eliminado', 'OK', { duration: 2500 })
    );
  }

  exportExcel() {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Resumen del Fondo
    const fundSummary = [
      { 'Concepto': 'Ingresos Totales', 'Monto (DOP)': this.totalIncome() },
      { 'Concepto': 'Gastos Totales', 'Monto (DOP)': this.totalExpenses() },
      { 'Concepto': 'Balance del Fondo', 'Monto (DOP)': this.balance() },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fundSummary), 'Resumen del Fondo');

    // Sheet 2: Players summary
    const playerData = this.playerSummaries().map(s => ({
      'Número': s.player.number,
      'Jugador': s.player.name,
      'Total Pagado (DOP)': s.totalPaid,
      'Semanas Pagadas': s.weeksPaid,
      'Semanas Adeudadas (Temporada)': s.weeksOwed,
      'Total Adeudado (DOP)': s.totalOwed,
      'Deuda con Temporada (DOP)': s.debtAmount,
      'Semanas Adelantadas': s.weeksAhead,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(playerData), 'Jugadores');

    // Sheet 3: Payment history
    const paymentData = this.allPayments().map(p => ({
      'Fecha': p.date,
      'Jugador': p.playerName,
      'Número': p.playerNumber,
      'Monto (DOP)': p.amount,
      'Nota': p.note ?? '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentData), 'Historial de Pagos');

    // Sheet 4: Expenses
    const expenseData = this.allExpenses().map(e => ({
      'Fecha': e.date,
      'Razón': e.reason,
      'Monto (DOP)': e.amount,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseData), 'Gastos del Fondo');

    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `fondo-beisbol-${today}.xlsx`);
    this.snackBar.open('Excel generado correctamente', 'OK', { duration: 3000 });
  }
}
