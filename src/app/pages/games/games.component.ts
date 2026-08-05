import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { GameService } from '../../services/game.service';
import { Game } from '../../models/game.model';
import { GameDialogComponent } from './game-dialog.component';

@Component({
  selector: 'app-games',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule,
    MatDialogModule, MatCardModule, MatSnackBarModule,
    MatSelectModule, MatFormFieldModule, MatInputModule,
    MatDatepickerModule, MatNativeDateModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1><mat-icon>event</mat-icon> Partidos</h1>
        <button mat-raised-button color="primary" (click)="openDialog()">
          <mat-icon>add</mat-icon> Nuevo Partido
        </button>
      </div>

      <div class="filters-row">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Buscar rival</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [ngModel]="searchOpponent()" (ngModelChange)="searchOpponent.set($event)" placeholder="Equipo rival...">
          @if (searchOpponent()) {
            <button matSuffix mat-icon-button (click)="searchOpponent.set('')">
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="date-field">
          <mat-label>Filtrar por fecha</mat-label>
          <input matInput [matDatepicker]="picker"
            [ngModel]="searchDate()" (ngModelChange)="searchDate.set($event)"
            placeholder="dd/mm/aaaa" readonly>
          <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
          @if (searchDate()) {
            <button matSuffix mat-icon-button (click)="searchDate.set(null)">
              <mat-icon>close</mat-icon>
            </button>
          }
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline" class="season-field">
          <mat-label>Temporada</mat-label>
          <mat-select [ngModel]="selectedSeason()" (ngModelChange)="selectedSeason.set($event)">
            <mat-option value="">Todas</mat-option>
            @for (s of seasons; track s) {
              <mat-option [value]="s">{{ s }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <div class="results-info">
        {{ filtered().length }} partido{{ filtered().length !== 1 ? 's' : '' }}
        @if (hasActiveFilters()) { encontrados }
      </div>

      <div class="cards-list">
        @for (g of filtered(); track g.id) {
          <mat-card class="game-card">
            <mat-card-content>
              <div class="game-row">
                <div class="game-main">
                  <div class="game-top">
                    <span [class]="'result-badge result-' + g.result">{{ resultLabel(g.result) }}</span>
                    <span class="score">{{ g.teamScore }} – {{ g.opponentScore }}</span>
                    <span class="season-chip">{{ g.season }}</span>
                  </div>
                  <div class="opponent">vs <strong>{{ g.opponent }}</strong></div>
                  <div class="game-date">
                    <mat-icon>calendar_today</mat-icon>
                    {{ g.date | date:'dd/MM/yyyy':'UTC' }}
                  </div>
                </div>
                <div class="game-actions">
                  <button mat-icon-button color="accent" (click)="goToDetail(g)" title="Estadísticas">
                    <mat-icon>bar_chart</mat-icon>
                  </button>
                  <button mat-icon-button color="primary" (click)="openDialog(g)" title="Editar">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="delete(g)" title="Eliminar">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        }
      </div>

      @if (filtered().length === 0 && !hasActiveFilters()) {
        <div class="empty-state">
          <mat-icon>event_busy</mat-icon>
          <p>No hay partidos registrados. ¡Agrega el primero!</p>
        </div>
      }
      @if (filtered().length === 0 && hasActiveFilters()) {
        <div class="empty-state">
          <mat-icon>search_off</mat-icon>
          <p>No se encontraron partidos con los filtros aplicados.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 800px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    .page-header h1 { display: flex; align-items: center; gap: 8px; margin: 0; }

    .filters-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 4px; }
    .search-field { flex: 2; min-width: 180px; }
    .date-field { flex: 1.5; min-width: 160px; }
    .season-field { flex: 1; min-width: 120px; }

    .results-info { font-size: 0.82rem; color: #888; margin-bottom: 16px; padding-left: 2px; }

    .cards-list { display: flex; flex-direction: column; gap: 12px; }

    .game-card { border-radius: 12px; transition: box-shadow 0.2s; border-left: 4px solid var(--blue); }
    .game-card:hover { box-shadow: 0 4px 16px rgba(21,101,192,0.18) !important; }

    .game-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .game-main { flex: 1; min-width: 0; }

    .game-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }

    .result-badge {
      padding: 3px 12px; border-radius: 20px;
      font-weight: 700; font-size: 0.85rem; white-space: nowrap;
    }
    .result-W { background: #e8f5e9; color: #2e7d32; }
    .result-L { background: var(--red-bg); color: var(--red); }
    .result-T { background: #fff3e0; color: #e65100; }
    .result-- { background: #f5f5f5; color: #999; }

    .score {
      font-size: 1.2rem; font-weight: 700; color: var(--blue);
      background: var(--blue-bg); padding: 3px 12px; border-radius: 20px;
    }
    .season-chip {
      background: #1A237E; color: white;
      padding: 3px 10px; border-radius: 20px;
      font-size: 0.8rem; font-weight: 600;
    }

    .opponent { font-size: 1rem; margin-bottom: 4px; color: var(--black); font-weight: 500; }
    .game-date { display: flex; align-items: center; gap: 4px; font-size: 0.82rem; color: #888; }
    .game-date mat-icon { font-size: 14px; height: 14px; width: 14px; }

    .game-actions { display: flex; flex-direction: column; gap: 0; }

    .empty-state { text-align: center; padding: 56px 16px; color: #bbb; }
    .empty-state mat-icon { font-size: 56px; height: 56px; width: 56px; display: block; margin: 0 auto 12px; }

    @media (max-width: 600px) {
      .page-container { padding: 12px; }
      .filters-row { gap: 8px; }
      .search-field, .date-field, .season-field { flex: 1 1 100%; min-width: unset; }
      .game-actions { flex-direction: row; }
    }
  `]
})
export class GamesComponent implements OnInit {
  private gameService = inject(GameService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  private allGames = signal<Game[]>([]);
  seasons: string[] = [];
  selectedSeason = signal('');
  searchOpponent = signal('');
  searchDate = signal<Date | null>(null);

  filtered = computed(() => {
    let list = this.allGames();
    if (this.selectedSeason()) {
      list = list.filter(g => g.season === this.selectedSeason());
    }
    if (this.searchOpponent().trim()) {
      const q = this.searchOpponent().toLowerCase().trim();
      list = list.filter(g => g.opponent.toLowerCase().includes(q));
    }
    const d = this.searchDate();
    if (d) {
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      list = list.filter(g => g.date === iso);
    }
    return list;
  });

  hasActiveFilters = computed(() =>
    !!this.selectedSeason() || !!this.searchOpponent().trim() || this.searchDate() !== null
  );

  ngOnInit() {
    this.gameService.getAll().subscribe(data => {
      this.allGames.set(data);
      this.seasons = [...new Set(data.map(g => g.season))].sort((a, b) => b.localeCompare(a));
    });
  }

  resultLabel(r: string) {
    const map: Record<string, string> = { W: 'Victoria', L: 'Derrota', T: 'Empate', '-': 'Pendiente' };
    return map[r] ?? r;
  }

  openDialog(game?: Game) {
    const ref = this.dialog.open(GameDialogComponent, {
      width: '480px',
      data: game ?? null,
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      if (result.id) {
        this.gameService.update(result.id, result).then(() =>
          this.snackBar.open('Partido actualizado', 'OK', { duration: 2500 })
        );
      } else {
        this.gameService.add(result).then(() =>
          this.snackBar.open('Partido registrado', 'OK', { duration: 2500 })
        );
      }
    });
  }

  goToDetail(game: Game) {
    this.router.navigate(['/games', game.id]);
  }

  delete(game: Game) {
    if (!confirm(`¿Eliminar el partido vs ${game.opponent}?`)) return;
    this.gameService.delete(game.id!).then(() =>
      this.snackBar.open('Partido eliminado', 'OK', { duration: 2500 })
    );
  }
}
