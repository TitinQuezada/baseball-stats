import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PlayerService } from '../../services/player.service';
import { Player } from '../../models/player.model';
import { PlayerDialogComponent } from './player-dialog.component';
import { PaymentDialogComponent } from '../payments/payment-dialog.component';

@Component({
  selector: 'app-players',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule,
    MatDialogModule, MatCardModule, MatSnackBarModule,
    MatFormFieldModule, MatInputModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1><mat-icon>group</mat-icon> Jugadores</h1>
        <button mat-raised-button color="primary" (click)="openDialog()">
          <mat-icon>person_add</mat-icon> Agregar Jugador
        </button>
      </div>

      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Buscar jugador</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [ngModel]="searchText()" (ngModelChange)="searchText.set($event)" placeholder="Nombre del jugador...">
        @if (searchText()) {
          <button matSuffix mat-icon-button (click)="searchText.set('')">
            <mat-icon>close</mat-icon>
          </button>
        }
      </mat-form-field>

      <div class="results-info">
        {{ filtered().length }} jugador{{ filtered().length !== 1 ? 'es' : '' }}
        @if (searchText()) { encontrados }
      </div>

      <div class="cards-grid">
        @for (p of filtered(); track p.id) {
          <mat-card class="player-card" [class.inactive]="!p.active" (click)="openDialog(p)">
            <mat-card-content>
              <div class="card-top">
                <span class="number-badge">#{{ p.number }}</span>
                <span [class]="p.active ? 'status-active' : 'status-inactive'">
                  <mat-icon>{{ p.active ? 'check_circle' : 'cancel' }}</mat-icon>
                  {{ p.active ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
              <div class="player-name">{{ p.name }}</div>
              <div class="card-bottom">
                <span class="position-badge">{{ p.position }}</span>
                <div class="card-actions">
                  <button mat-icon-button color="primary" (click)="openPaymentDialog(p, $event)" title="Registrar Pago">
                    <mat-icon>payments</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="delete(p, $event)" title="Eliminar">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        }
      </div>

      @if (filtered().length === 0 && !searchText) {
        <div class="empty-state">
          <mat-icon>group_off</mat-icon>
          <p>No hay jugadores registrados. ¡Agrega el primero!</p>
        </div>
      }
      @if (filtered().length === 0 && searchText()) {
        <div class="empty-state">
          <mat-icon>search_off</mat-icon>
          <p>No se encontraron jugadores con "{{ searchText() }}"</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 960px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    .page-header h1 { display: flex; align-items: center; gap: 8px; margin: 0; }

    .search-field { width: 100%; margin-bottom: 4px; }
    .results-info { font-size: 0.82rem; color: #888; margin-bottom: 16px; padding-left: 2px; }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }

    .player-card { border-radius: 12px; transition: box-shadow 0.2s; border-top: 3px solid var(--red); }
    .player-card:hover { box-shadow: 0 4px 16px rgba(198,40,40,0.18) !important; }
    .player-card.inactive { opacity: 0.60; border-top-color: #bbb; }

    .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .number-badge {
      background: var(--red); color: white;
      padding: 4px 14px; border-radius: 20px;
      font-weight: 700; font-size: 1rem;
    }
    .status-active { display: flex; align-items: center; gap: 3px; color: #2e7d32; font-size: 0.8rem; font-weight: 600; }
    .status-active mat-icon { font-size: 16px; height: 16px; width: 16px; }
    .status-inactive { display: flex; align-items: center; gap: 3px; color: #888; font-size: 0.8rem; font-weight: 600; }
    .status-inactive mat-icon { font-size: 16px; height: 16px; width: 16px; }

    .player-name { font-size: 1.1rem; font-weight: 700; margin-bottom: 12px; color: var(--black); }

    .card-bottom { display: flex; justify-content: space-between; align-items: center; }
    .position-badge {
      background: var(--blue-bg); color: var(--blue);
      padding: 4px 12px; border-radius: 20px;
      font-size: 0.82rem; font-weight: 600;
    }
    .card-actions { display: flex; gap: 0; }

    .empty-state { text-align: center; padding: 56px 16px; color: #bbb; }
    .empty-state mat-icon { font-size: 56px; height: 56px; width: 56px; display: block; margin: 0 auto 12px; }

    @media (max-width: 600px) {
      .page-container { padding: 12px; }
      .cards-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
    }
  `]
})
export class PlayersComponent implements OnInit {
  private playerService = inject(PlayerService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  private allPlayers = signal<Player[]>([]);
  searchText = signal('');

  filtered = computed(() => {
    const q = this.searchText().toLowerCase().trim();
    if (!q) return this.allPlayers();
    return this.allPlayers().filter(p => p.name.toLowerCase().includes(q));
  });

  ngOnInit() {
    this.playerService.getAll().subscribe({
      next: (data) => this.allPlayers.set(data),
      error: (err) => console.error(err),
    });
  }

  openDialog(player?: Player) {
    const ref = this.dialog.open(PlayerDialogComponent, {
      width: '420px',
      data: player ?? null,
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      if (result.id) {
        this.playerService.update(result.id, result).then(() =>
          this.snackBar.open('Jugador actualizado', 'OK', { duration: 2500 })
        );
      } else {
        this.playerService.add(result).then(() =>
          this.snackBar.open('Jugador agregado', 'OK', { duration: 2500 })
        );
      }
    });
  }

  openPaymentDialog(player: Player, event: MouseEvent) {
    event.stopPropagation();
    this.dialog.open(PaymentDialogComponent, {
      width: '460px',
      data: player,
    });
  }

  delete(player: Player, event: MouseEvent) {
    event.stopPropagation();
    if (!confirm(`¿Eliminar a ${player.name}?`)) return;
    this.playerService.delete(player.id!).then(() =>
      this.snackBar.open('Jugador eliminado', 'OK', { duration: 2500 })
    );
  }
}
