import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { GameService } from '../../services/game.service';
import { StatsService } from '../../services/stats.service';
import { Game } from '../../models/game.model';
import { PlayerSeasonStats, PlayerGameStats, BattingStats } from '../../models/stats.model';

interface MvpEntry {
  name: string;
  number: number;
  rank: 1 | 2;
  avg: number;
  h: number;
  hr: number;
}

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatFormFieldModule, MatSelectModule, MatTabsModule,
    MatProgressSpinnerModule, MatChipsModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1><mat-icon>bar_chart</mat-icon> Estadísticas</h1>
        <mat-form-field appearance="outline" class="season-select">
          <mat-label>Temporada</mat-label>
          <mat-select [(ngModel)]="selectedSeason" (ngModelChange)="onSeasonChange()">
            @for (s of seasons(); track s) {
              <mat-option [value]="s">{{ s }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      @if (loading()) {
        <div class="loading-center"><mat-spinner></mat-spinner></div>
      } @else {
        <mat-tab-group>

          <!-- ── TAB 1: POR TEMPORADA ── -->
          <mat-tab label="Por Temporada">
            <div class="tab-content">

              <div class="tab-action-row">
                <button mat-stroked-button color="primary"
                  [disabled]="seasonStats().length === 0"
                  (click)="showTopSeason.set(!showTopSeason())">
                  <mat-icon>emoji_events</mat-icon>
                  {{ showTopSeason() ? 'Ocultar ranking' : 'Ver mejores jugadores' }}
                </button>
              </div>

              @if (showTopSeason() && seasonStats().length > 0) {
                <div class="mvp-panel">
                  <div class="mvp-panel-title"><mat-icon>emoji_events</mat-icon> Mejores Jugadores</div>
                  @for (p of topPlayersOf(seasonStats()); track p.number) {
                    <div [class]="'mvp-row rank-' + p.rank">
                      <span class="mvp-medal">{{ p.rank === 1 ? '🥇' : '🥈' }}</span>
                      <div class="mvp-details">
                        <div class="mvp-name">#{{ p.number }} {{ p.name }}</div>
                        <div class="mvp-breakdown">
                          AVG {{ p.avg | number:'1.3-3' }}&nbsp;·&nbsp;H {{ p.h }}&nbsp;·&nbsp;HR {{ p.hr }}
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }

              <h3>Bateo – Temporada {{ selectedSeason }}</h3>
              <mat-card>
                <mat-card-content>
                  <div class="table-wrapper">
                    <table mat-table [dataSource]="seasonStats()" class="full-width stats-table">
                      <ng-container matColumnDef="number">
                        <th mat-header-cell *matHeaderCellDef>#</th>
                        <td mat-cell *matCellDef="let s">{{ s.playerNumber }}</td>
                      </ng-container>
                      <ng-container matColumnDef="name">
                        <th mat-header-cell *matHeaderCellDef>Jugador</th>
                        <td mat-cell *matCellDef="let s">{{ s.playerName }}</td>
                      </ng-container>
                      <ng-container matColumnDef="pos">
                        <th mat-header-cell *matHeaderCellDef>Pos</th>
                        <td mat-cell *matCellDef="let s">{{ s.playerPosition }}</td>
                      </ng-container>
                      <ng-container matColumnDef="gp">
                        <th mat-header-cell *matHeaderCellDef>JJ</th>
                        <td mat-cell *matCellDef="let s">{{ s.gamesPlayed }}</td>
                      </ng-container>
                      <ng-container matColumnDef="avg">
                        <th mat-header-cell *matHeaderCellDef>AVG</th>
                        <td mat-cell *matCellDef="let s" class="stat-highlight">{{ s.avg | number:'1.3-3' }}</td>
                      </ng-container>
                      <ng-container matColumnDef="ab">
                        <th mat-header-cell *matHeaderCellDef>AB</th>
                        <td mat-cell *matCellDef="let s">{{ s.batting.AB }}</td>
                      </ng-container>
                      <ng-container matColumnDef="h">
                        <th mat-header-cell *matHeaderCellDef>H</th>
                        <td mat-cell *matCellDef="let s">{{ s.batting.H }}</td>
                      </ng-container>
                      <ng-container matColumnDef="hr">
                        <th mat-header-cell *matHeaderCellDef>HR</th>
                        <td mat-cell *matCellDef="let s">{{ s.batting.HR }}</td>
                      </ng-container>
                      <ng-container matColumnDef="rbi">
                        <th mat-header-cell *matHeaderCellDef>RBI</th>
                        <td mat-cell *matCellDef="let s">{{ s.batting.RBI }}</td>
                      </ng-container>
                      <ng-container matColumnDef="bb">
                        <th mat-header-cell *matHeaderCellDef>BB</th>
                        <td mat-cell *matCellDef="let s">{{ s.batting.BB }}</td>
                      </ng-container>
                      <ng-container matColumnDef="so">
                        <th mat-header-cell *matHeaderCellDef>SO</th>
                        <td mat-cell *matCellDef="let s">{{ s.batting.SO }}</td>
                      </ng-container>
                      <tr mat-header-row *matHeaderRowDef="battingCols"></tr>
                      <tr mat-row *matRowDef="let row; columns: battingCols;"></tr>
                    </table>
                  </div>
                  @if (seasonStats().length === 0) {
                    <div class="empty-state">No hay estadísticas para esta temporada.</div>
                  }
                </mat-card-content>
              </mat-card>

              <h3 style="margin-top:24px">Pitcheo – Temporada {{ selectedSeason }}</h3>
              <mat-card>
                <mat-card-content>
                  <div class="table-wrapper">
                    <table mat-table [dataSource]="seasonStats()" class="full-width stats-table">
                      <ng-container matColumnDef="number">
                        <th mat-header-cell *matHeaderCellDef>#</th>
                        <td mat-cell *matCellDef="let s">{{ s.playerNumber }}</td>
                      </ng-container>
                      <ng-container matColumnDef="name">
                        <th mat-header-cell *matHeaderCellDef>Jugador</th>
                        <td mat-cell *matCellDef="let s">{{ s.playerName }}</td>
                      </ng-container>
                      <ng-container matColumnDef="pbb">
                        <th mat-header-cell *matHeaderCellDef>BB</th>
                        <td mat-cell *matCellDef="let s">{{ s.pitching.BB }}</td>
                      </ng-container>
                      <ng-container matColumnDef="pso">
                        <th mat-header-cell *matHeaderCellDef>SO</th>
                        <td mat-cell *matCellDef="let s">{{ s.pitching.SO }}</td>
                      </ng-container>
                      <tr mat-header-row *matHeaderRowDef="pitchingCols"></tr>
                      <tr mat-row *matRowDef="let row; columns: pitchingCols;"></tr>
                    </table>
                  </div>
                </mat-card-content>
              </mat-card>

              <h3 style="margin-top:24px">Fielding – Temporada {{ selectedSeason }}</h3>
              <mat-card>
                <mat-card-content>
                  <div class="table-wrapper">
                    <table mat-table [dataSource]="seasonStats()" class="full-width stats-table">
                      <ng-container matColumnDef="number">
                        <th mat-header-cell *matHeaderCellDef>#</th>
                        <td mat-cell *matCellDef="let s">{{ s.playerNumber }}</td>
                      </ng-container>
                      <ng-container matColumnDef="name">
                        <th mat-header-cell *matHeaderCellDef>Jugador</th>
                        <td mat-cell *matCellDef="let s">{{ s.playerName }}</td>
                      </ng-container>
                      <ng-container matColumnDef="errors">
                        <th mat-header-cell *matHeaderCellDef>Errores</th>
                        <td mat-cell *matCellDef="let s">{{ s.fielding.errors }}</td>
                      </ng-container>
                      <ng-container matColumnDef="outs">
                        <th mat-header-cell *matHeaderCellDef>Outs</th>
                        <td mat-cell *matCellDef="let s">{{ s.fielding.outs }}</td>
                      </ng-container>
                      <tr mat-header-row *matHeaderRowDef="fieldingCols"></tr>
                      <tr mat-row *matRowDef="let row; columns: fieldingCols;"></tr>
                    </table>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- ── TAB 2: POR DÍA ── -->
          <mat-tab label="Por Día">
            <div class="tab-content">
              <mat-form-field appearance="outline" class="full-select">
                <mat-label>Seleccionar fecha</mat-label>
                <mat-icon matPrefix>calendar_today</mat-icon>
                <mat-select [(ngModel)]="selectedDate" (ngModelChange)="loadDayStats()">
                  @for (d of availableDates(); track d) {
                    <mat-option [value]="d">{{ d | date:'EEEE dd/MM/yyyy':'UTC' }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              @if (selectedDate && dayGames().length) {
                <div class="day-games-row">
                  @for (g of dayGames(); track g.id) {
                    <div class="day-game-chip">
                      <mat-icon>sports_baseball</mat-icon>
                      vs <strong>{{ g.opponent }}</strong>
                      <span [class]="'result-badge result-' + g.result">{{ resultLabel(g.result) }}</span>
                      <span class="score-inline">{{ g.teamScore }}–{{ g.opponentScore }}</span>
                    </div>
                  }
                </div>
              }

              @if (loadingDay()) {
                <div class="loading-center"><mat-spinner diameter="40"></mat-spinner></div>
              } @else if (selectedDate) {

                <div class="tab-action-row">
                  <button mat-stroked-button color="primary"
                    [disabled]="dayStats().length === 0"
                    (click)="showTopDay.set(!showTopDay())">
                    <mat-icon>emoji_events</mat-icon>
                    {{ showTopDay() ? 'Ocultar ranking' : 'Ver mejores jugadores' }}
                  </button>
                </div>

                @if (showTopDay() && dayStats().length > 0) {
                  <div class="mvp-panel">
                    <div class="mvp-panel-title"><mat-icon>emoji_events</mat-icon> Mejores Jugadores</div>
                    @for (p of topPlayersOf(dayStats()); track p.number) {
                      <div [class]="'mvp-row rank-' + p.rank">
                        <span class="mvp-medal">{{ p.rank === 1 ? '🥇' : '🥈' }}</span>
                        <div class="mvp-details">
                          <div class="mvp-name">#{{ p.number }} {{ p.name }}</div>
                          <div class="mvp-breakdown">
                            AVG {{ p.avg | number:'1.3-3' }}&nbsp;·&nbsp;H {{ p.h }}&nbsp;·&nbsp;HR {{ p.hr }}
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }

                <h3>Bateo – {{ selectedDate | date:'dd/MM/yyyy':'UTC' }}</h3>
                <mat-card>
                  <mat-card-content>
                    <div class="table-wrapper">
                      <table mat-table [dataSource]="dayStats()" class="full-width stats-table">
                        <ng-container matColumnDef="number">
                          <th mat-header-cell *matHeaderCellDef>#</th>
                          <td mat-cell *matCellDef="let s">{{ s.playerNumber }}</td>
                        </ng-container>
                        <ng-container matColumnDef="name">
                          <th mat-header-cell *matHeaderCellDef>Jugador</th>
                          <td mat-cell *matCellDef="let s">{{ s.playerName }}</td>
                        </ng-container>
                        <ng-container matColumnDef="avg">
                          <th mat-header-cell *matHeaderCellDef>AVG</th>
                          <td mat-cell *matCellDef="let s" class="stat-highlight">{{ s.avg | number:'1.3-3' }}</td>
                        </ng-container>
                        <ng-container matColumnDef="ab">
                          <th mat-header-cell *matHeaderCellDef>AB</th>
                          <td mat-cell *matCellDef="let s">{{ s.batting.AB }}</td>
                        </ng-container>
                        <ng-container matColumnDef="h">
                          <th mat-header-cell *matHeaderCellDef>H</th>
                          <td mat-cell *matCellDef="let s">{{ s.batting.H }}</td>
                        </ng-container>
                        <ng-container matColumnDef="hr">
                          <th mat-header-cell *matHeaderCellDef>HR</th>
                          <td mat-cell *matCellDef="let s">{{ s.batting.HR }}</td>
                        </ng-container>
                        <ng-container matColumnDef="rbi">
                          <th mat-header-cell *matHeaderCellDef>RBI</th>
                          <td mat-cell *matCellDef="let s">{{ s.batting.RBI }}</td>
                        </ng-container>
                        <ng-container matColumnDef="bb">
                          <th mat-header-cell *matHeaderCellDef>BB</th>
                          <td mat-cell *matCellDef="let s">{{ s.batting.BB }}</td>
                        </ng-container>
                        <ng-container matColumnDef="so">
                          <th mat-header-cell *matHeaderCellDef>SO</th>
                          <td mat-cell *matCellDef="let s">{{ s.batting.SO }}</td>
                        </ng-container>
                        <tr mat-header-row *matHeaderRowDef="dayBattingCols"></tr>
                        <tr mat-row *matRowDef="let row; columns: dayBattingCols;"></tr>
                      </table>
                    </div>
                    @if (dayStats().length === 0) {
                      <div class="empty-state">No hay estadísticas para este día.</div>
                    }
                  </mat-card-content>
                </mat-card>

                <h3 style="margin-top:20px">Pitcheo – {{ selectedDate | date:'dd/MM/yyyy':'UTC' }}</h3>
                <mat-card>
                  <mat-card-content>
                    <div class="table-wrapper">
                      <table mat-table [dataSource]="dayStats()" class="full-width stats-table">
                        <ng-container matColumnDef="number">
                          <th mat-header-cell *matHeaderCellDef>#</th>
                          <td mat-cell *matCellDef="let s">{{ s.playerNumber }}</td>
                        </ng-container>
                        <ng-container matColumnDef="name">
                          <th mat-header-cell *matHeaderCellDef>Jugador</th>
                          <td mat-cell *matCellDef="let s">{{ s.playerName }}</td>
                        </ng-container>
                        <ng-container matColumnDef="pbb">
                          <th mat-header-cell *matHeaderCellDef>BB</th>
                          <td mat-cell *matCellDef="let s">{{ s.pitching.BB }}</td>
                        </ng-container>
                        <ng-container matColumnDef="pso">
                          <th mat-header-cell *matHeaderCellDef>SO</th>
                          <td mat-cell *matCellDef="let s">{{ s.pitching.SO }}</td>
                        </ng-container>
                        <tr mat-header-row *matHeaderRowDef="pitchingCols"></tr>
                        <tr mat-row *matRowDef="let row; columns: pitchingCols;"></tr>
                      </table>
                    </div>
                  </mat-card-content>
                </mat-card>

                <h3 style="margin-top:20px">Fielding – {{ selectedDate | date:'dd/MM/yyyy':'UTC' }}</h3>
                <mat-card>
                  <mat-card-content>
                    <div class="table-wrapper">
                      <table mat-table [dataSource]="dayStats()" class="full-width stats-table">
                        <ng-container matColumnDef="number">
                          <th mat-header-cell *matHeaderCellDef>#</th>
                          <td mat-cell *matCellDef="let s">{{ s.playerNumber }}</td>
                        </ng-container>
                        <ng-container matColumnDef="name">
                          <th mat-header-cell *matHeaderCellDef>Jugador</th>
                          <td mat-cell *matCellDef="let s">{{ s.playerName }}</td>
                        </ng-container>
                        <ng-container matColumnDef="errors">
                          <th mat-header-cell *matHeaderCellDef>Errores</th>
                          <td mat-cell *matCellDef="let s">{{ s.fielding.errors }}</td>
                        </ng-container>
                        <ng-container matColumnDef="outs">
                          <th mat-header-cell *matHeaderCellDef>Outs</th>
                          <td mat-cell *matCellDef="let s">{{ s.fielding.outs }}</td>
                        </ng-container>
                        <tr mat-header-row *matHeaderRowDef="fieldingCols"></tr>
                        <tr mat-row *matRowDef="let row; columns: fieldingCols;"></tr>
                      </table>
                    </div>
                  </mat-card-content>
                </mat-card>
              } @else if (!selectedDate) {
                <div class="empty-state">
                  <mat-icon>calendar_today</mat-icon>
                  <p>Selecciona una fecha para ver las estadísticas del día.</p>
                </div>
              }
            </div>
          </mat-tab>

          <!-- ── TAB 3: POR PARTIDO ── -->
          <mat-tab label="Por Partido">
            <div class="tab-content">
              <mat-form-field appearance="outline" class="full-select">
                <mat-label>Seleccionar partido</mat-label>
                <mat-select [(ngModel)]="selectedGameId" (ngModelChange)="loadGameStats()">
                  @for (g of seasonGames(); track g.id) {
                    <mat-option [value]="g.id">
                      {{ g.date | date:'dd/MM/yyyy':'UTC' }} vs {{ g.opponent }}
                      <span [class]="'result-'+g.result"> ({{g.result}})</span>
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>

              @if (selectedGameId) {

                <div class="tab-action-row">
                  <button mat-stroked-button color="primary"
                    [disabled]="gameStats().length === 0"
                    (click)="showTopGame.set(!showTopGame())">
                    <mat-icon>emoji_events</mat-icon>
                    {{ showTopGame() ? 'Ocultar ranking' : 'Ver mejores jugadores' }}
                  </button>
                </div>

                @if (showTopGame() && gameStats().length > 0) {
                  <div class="mvp-panel">
                    <div class="mvp-panel-title"><mat-icon>emoji_events</mat-icon> Mejores Jugadores</div>
                    @for (p of topPlayersOf(gameStats()); track p.number) {
                      <div [class]="'mvp-row rank-' + p.rank">
                        <span class="mvp-medal">{{ p.rank === 1 ? '🥇' : '🥈' }}</span>
                        <div class="mvp-details">
                          <div class="mvp-name">#{{ p.number }} {{ p.name }}</div>
                          <div class="mvp-breakdown">
                            AVG {{ p.avg | number:'1.3-3' }}&nbsp;·&nbsp;H {{ p.h }}&nbsp;·&nbsp;HR {{ p.hr }}
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }

                <h3>Bateo</h3>
                <mat-card>
                  <mat-card-content>
                    <div class="table-wrapper">
                      <table mat-table [dataSource]="gameStats()" class="full-width stats-table">
                        <ng-container matColumnDef="number">
                          <th mat-header-cell *matHeaderCellDef>#</th>
                          <td mat-cell *matCellDef="let s">{{ s.playerNumber }}</td>
                        </ng-container>
                        <ng-container matColumnDef="name">
                          <th mat-header-cell *matHeaderCellDef>Jugador</th>
                          <td mat-cell *matCellDef="let s">{{ s.playerName }}</td>
                        </ng-container>
                        <ng-container matColumnDef="avg">
                          <th mat-header-cell *matHeaderCellDef>AVG</th>
                          <td mat-cell *matCellDef="let s" class="stat-highlight">
                            {{ s.batting.AB > 0 ? ((s.batting.H + s.batting.HR) / s.batting.AB | number:'1.3-3') : '.000' }}
                          </td>
                        </ng-container>
                        <ng-container matColumnDef="ab">
                          <th mat-header-cell *matHeaderCellDef>AB</th>
                          <td mat-cell *matCellDef="let s">{{ s.batting.AB }}</td>
                        </ng-container>
                        <ng-container matColumnDef="h">
                          <th mat-header-cell *matHeaderCellDef>H</th>
                          <td mat-cell *matCellDef="let s">{{ s.batting.H }}</td>
                        </ng-container>
                        <ng-container matColumnDef="hr">
                          <th mat-header-cell *matHeaderCellDef>HR</th>
                          <td mat-cell *matCellDef="let s">{{ s.batting.HR }}</td>
                        </ng-container>
                        <ng-container matColumnDef="rbi">
                          <th mat-header-cell *matHeaderCellDef>RBI</th>
                          <td mat-cell *matCellDef="let s">{{ s.batting.RBI }}</td>
                        </ng-container>
                        <ng-container matColumnDef="bb">
                          <th mat-header-cell *matHeaderCellDef>BB</th>
                          <td mat-cell *matCellDef="let s">{{ s.batting.BB }}</td>
                        </ng-container>
                        <ng-container matColumnDef="so">
                          <th mat-header-cell *matHeaderCellDef>SO</th>
                          <td mat-cell *matCellDef="let s">{{ s.batting.SO }}</td>
                        </ng-container>
                        <tr mat-header-row *matHeaderRowDef="gameBattingCols"></tr>
                        <tr mat-row *matRowDef="let row; columns: gameBattingCols;"></tr>
                      </table>
                    </div>
                    @if (gameStats().length === 0) {
                      <div class="empty-state">No hay estadísticas para este partido.</div>
                    }
                  </mat-card-content>
                </mat-card>

                <h3 style="margin-top:20px">Pitcheo</h3>
                <mat-card>
                  <mat-card-content>
                    <div class="table-wrapper">
                      <table mat-table [dataSource]="gameStats()" class="full-width stats-table">
                        <ng-container matColumnDef="number">
                          <th mat-header-cell *matHeaderCellDef>#</th>
                          <td mat-cell *matCellDef="let s">{{ s.playerNumber }}</td>
                        </ng-container>
                        <ng-container matColumnDef="name">
                          <th mat-header-cell *matHeaderCellDef>Jugador</th>
                          <td mat-cell *matCellDef="let s">{{ s.playerName }}</td>
                        </ng-container>
                        <ng-container matColumnDef="pbb">
                          <th mat-header-cell *matHeaderCellDef>BB</th>
                          <td mat-cell *matCellDef="let s">{{ s.pitching.BB }}</td>
                        </ng-container>
                        <ng-container matColumnDef="pso">
                          <th mat-header-cell *matHeaderCellDef>SO</th>
                          <td mat-cell *matCellDef="let s">{{ s.pitching.SO }}</td>
                        </ng-container>
                        <tr mat-header-row *matHeaderRowDef="pitchingCols"></tr>
                        <tr mat-row *matRowDef="let row; columns: pitchingCols;"></tr>
                      </table>
                    </div>
                  </mat-card-content>
                </mat-card>

                <h3 style="margin-top:20px">Fielding</h3>
                <mat-card>
                  <mat-card-content>
                    <div class="table-wrapper">
                      <table mat-table [dataSource]="gameStats()" class="full-width stats-table">
                        <ng-container matColumnDef="number">
                          <th mat-header-cell *matHeaderCellDef>#</th>
                          <td mat-cell *matCellDef="let s">{{ s.playerNumber }}</td>
                        </ng-container>
                        <ng-container matColumnDef="name">
                          <th mat-header-cell *matHeaderCellDef>Jugador</th>
                          <td mat-cell *matCellDef="let s">{{ s.playerName }}</td>
                        </ng-container>
                        <ng-container matColumnDef="errors">
                          <th mat-header-cell *matHeaderCellDef>Errores</th>
                          <td mat-cell *matCellDef="let s">{{ s.fielding.errors }}</td>
                        </ng-container>
                        <ng-container matColumnDef="outs">
                          <th mat-header-cell *matHeaderCellDef>Outs</th>
                          <td mat-cell *matCellDef="let s">{{ s.fielding.outs }}</td>
                        </ng-container>
                        <tr mat-header-row *matHeaderRowDef="fieldingCols"></tr>
                        <tr mat-row *matRowDef="let row; columns: fieldingCols;"></tr>
                      </table>
                    </div>
                  </mat-card-content>
                </mat-card>
              }
            </div>
          </mat-tab>

        </mat-tab-group>
      }
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 1100px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .page-header h1 { display: flex; align-items: center; gap: 8px; margin: 0; }
    .season-select { width: 160px; }
    .full-select { width: 100%; margin-bottom: 12px; }
    .loading-center { display: flex; justify-content: center; padding: 80px; }
    .tab-content { padding: 20px 0; }
    .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .full-width { width: 100%; }
    .stats-table { font-size: 0.9rem; min-width: 480px; }
    .stat-highlight { font-weight: 700; color: var(--blue); }
    .empty-state { text-align: center; padding: 40px 16px; color: #bbb; }
    .empty-state mat-icon { font-size: 48px; height: 48px; width: 48px; display: block; margin: 0 auto 10px; }
    .empty-state p { margin: 0; }
    h3 { margin: 0 0 8px; font-size: 1rem; color: var(--blue); font-weight: 700; letter-spacing: 0.3px; }
    .result-W { color: #2e7d32; font-weight: 600; }
    .result-L { color: var(--red); font-weight: 600; }
    .result-T { color: #e65100; font-weight: 600; }

    /* Top players button row */
    .tab-action-row {
      display: flex; justify-content: flex-end;
      margin-bottom: 16px;
    }

    /* MVP panel */
    .mvp-panel {
      background: linear-gradient(135deg, #FFFDE7 0%, #FFF8E1 100%);
      border: 2px solid #FFD700;
      border-radius: 16px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .mvp-panel-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 1rem; font-weight: 700; color: #F57F17;
      margin-bottom: 12px;
    }
    .mvp-panel-title mat-icon { color: #FFD700; }
    .mvp-row {
      display: flex; align-items: center; gap: 14px;
      padding: 10px 14px; border-radius: 10px;
      background: white; margin-bottom: 8px;
      border-left: 5px solid;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .mvp-row:last-child { margin-bottom: 0; }
    .rank-1 { border-left-color: #FFD700; }
    .rank-2 { border-left-color: #B0BEC5; }
    .mvp-medal { font-size: 1.8rem; line-height: 1; flex-shrink: 0; }
    .mvp-details { flex: 1; min-width: 0; }
    .mvp-name { font-weight: 700; font-size: 0.95rem; color: var(--black); }
    .mvp-breakdown { font-size: 0.82rem; color: var(--blue); font-weight: 600; margin-top: 3px; }

    /* Day games header */
    .day-games-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
    .day-game-chip {
      display: flex; align-items: center; gap: 6px;
      background: white; border: 1.5px solid var(--blue);
      border-radius: 24px; padding: 6px 14px;
      font-size: 0.88rem; color: #333;
    }
    .day-game-chip mat-icon { font-size: 16px; height: 16px; width: 16px; color: var(--blue); }
    .result-badge {
      padding: 2px 10px; border-radius: 20px;
      font-weight: 700; font-size: 0.8rem;
    }
    .result-W.result-badge { background: #e8f5e9; color: #2e7d32; }
    .result-L.result-badge { background: var(--red-bg); color: var(--red); }
    .result-T.result-badge { background: #fff3e0; color: #e65100; }
    .result--.result-badge { background: #f5f5f5; color: #999; }
    .score-inline { font-weight: 700; color: var(--blue); }

    @media (max-width: 600px) {
      .page-container { padding: 12px; }
      .page-header { margin-bottom: 16px; }
      .season-select { width: 130px; }
    }
  `]
})
export class StatsComponent implements OnInit {
  private gameService  = inject(GameService);
  private statsService = inject(StatsService);

  seasons        = signal<string[]>([]);
  selectedSeason = new Date().getFullYear().toString();
  seasonGames    = signal<Game[]>([]);
  seasonStats    = signal<PlayerSeasonStats[]>([]);
  loading        = signal(true);
  private allGames: Game[] = [];

  // Por Partido
  selectedGameId = '';
  gameStats      = signal<PlayerGameStats[]>([]);

  // Por Día
  selectedDate   = '';
  availableDates = signal<string[]>([]);
  dayGames       = signal<Game[]>([]);
  dayStats       = signal<PlayerSeasonStats[]>([]);
  loadingDay     = signal(false);

  // Ranking visibility
  showTopSeason = signal(false);
  showTopDay    = signal(false);
  showTopGame   = signal(false);

  battingCols     = ['number', 'name', 'pos', 'gp', 'avg', 'ab', 'h', 'hr', 'rbi', 'bb', 'so'];
  dayBattingCols  = ['number', 'name', 'avg', 'ab', 'h', 'hr', 'rbi', 'bb', 'so'];
  pitchingCols    = ['number', 'name', 'pbb', 'pso'];
  fieldingCols    = ['number', 'name', 'errors', 'outs'];
  gameBattingCols = ['number', 'name', 'avg', 'ab', 'h', 'hr', 'rbi', 'bb', 'so'];

  ngOnInit() {
    this.gameService.getAll().subscribe(games => {
      this.allGames = games;
      const sorted = [...new Set(games.map(g => g.season))].sort((a, b) => b.localeCompare(a));
      this.seasons.set(sorted);
      if (sorted.length && !sorted.includes(this.selectedSeason)) {
        this.selectedSeason = sorted[0];
      }
      this.onSeasonChange();
    });
  }

  onSeasonChange() {
    this.loading.set(true);
    this.showTopSeason.set(false);
    this.showTopDay.set(false);
    this.showTopGame.set(false);
    const games = this.allGames.filter(g => g.season === this.selectedSeason);
    this.seasonGames.set(games);
    this.selectedGameId = '';
    this.selectedDate   = '';
    this.gameStats.set([]);
    this.dayStats.set([]);
    this.dayGames.set([]);

    const dates = [...new Set(games.map(g => g.date))].sort((a, b) => b.localeCompare(a));
    this.availableDates.set(dates);

    const gameIds = games.map(g => g.id!);
    if (!gameIds.length) {
      this.seasonStats.set([]);
      this.loading.set(false);
      return;
    }

    this.statsService.getAllForSeason(gameIds).subscribe(stats => {
      this.seasonStats.set(this.statsService.aggregateSeasonStats(stats));
      this.loading.set(false);
    });
  }

  loadDayStats() {
    if (!this.selectedDate) return;
    this.showTopDay.set(false);
    this.loadingDay.set(true);
    const games = this.seasonGames().filter(g => g.date === this.selectedDate);
    this.dayGames.set(games);
    const gameIds = games.map(g => g.id!);
    if (!gameIds.length) {
      this.dayStats.set([]);
      this.loadingDay.set(false);
      return;
    }
    this.statsService.getAllForSeason(gameIds).subscribe(stats => {
      this.dayStats.set(this.statsService.aggregateSeasonStats(stats));
      this.loadingDay.set(false);
    });
  }

  loadGameStats() {
    if (!this.selectedGameId) return;
    this.showTopGame.set(false);
    this.statsService.getByGame(this.selectedGameId).subscribe(stats => {
      this.gameStats.set(stats.sort((a, b) => a.playerNumber - b.playerNumber));
    });
  }

  calcScore(batting: BattingStats): number {
    return batting.HR * 3 + batting.H * 2 + batting.BB - batting.SO;
  }

  topPlayersOf(list: Array<{ playerName: string; playerNumber: number; batting: BattingStats }>): MvpEntry[] {
    if (!list.length) return [];
    const scored = list
      .map(p => {
        const b = p.batting;
        const avg = b.AB > 0 ? Math.round(((b.H + b.HR) / b.AB) * 1000) / 1000 : 0;
        return {
          name: p.playerName,
          number: p.playerNumber,
          score: this.calcScore(b),
          avg,
          h: b.H,
          hr: b.HR,
        };
      })
      .sort((a, b) => b.score - a.score);

    const top1Score = scored[0].score;
    const top1 = scored.filter(p => p.score === top1Score);

    if (top1.length >= 2) {
      return top1.map(({ score: _, ...p }) => ({ ...p, rank: 1 as const }));
    }

    const rest = scored.filter(p => p.score !== top1Score);
    if (!rest.length) return top1.map(({ score: _, ...p }) => ({ ...p, rank: 1 as const }));

    const top2Score = rest[0].score;
    return [
      ...top1.map(({ score: _, ...p }) => ({ ...p, rank: 1 as const })),
      ...rest.filter(p => p.score === top2Score).map(({ score: _, ...p }) => ({ ...p, rank: 2 as const })),
    ];
  }

  resultLabel(r: string) {
    const map: Record<string, string> = { W: 'Victoria', L: 'Derrota', T: 'Empate', '-': 'Pendiente' };
    return map[r] ?? r;
  }
}
