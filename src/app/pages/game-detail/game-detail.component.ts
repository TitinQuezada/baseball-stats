import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { switchMap, combineLatest } from 'rxjs';
import { GameService } from '../../services/game.service';
import { PlayerService } from '../../services/player.service';
import { StatsService } from '../../services/stats.service';
import { Game, InningScore } from '../../models/game.model';
import { Player, POSITIONS } from '../../models/player.model';
import { PlayerGameStats, emptyBatting, emptyPitching, emptyFielding } from '../../models/stats.model';

interface PlayerEntry {
  player: Player;
  form: FormGroup;
  included: boolean;
  saved: boolean;
}

@Component({
  selector: 'app-game-detail',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatCardModule, MatButtonModule,
    MatIconModule, MatTabsModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatDividerModule,
    MatFormFieldModule, MatInputModule,
  ],
  template: `
    <div class="page-container">
      @if (loading()) {
        <div class="loading-center"><mat-spinner></mat-spinner></div>
      } @else if (game()) {
        <div class="page-header">
          <div>
            <button mat-icon-button (click)="back()">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <h1>vs {{ game()!.opponent }}</h1>
          </div>
          <div class="game-info">
            <span class="info-chip">{{ game()!.date | date:'dd/MM/yyyy':'UTC' }}</span>
            <span class="info-chip">Temporada {{ game()!.season }}</span>
            <span [class]="'result-badge result-' + game()!.result">{{ game()!.result }}</span>
            <span class="score-chip">{{ game()!.teamScore }} – {{ game()!.opponentScore }}</span>
          </div>
        </div>

        <p class="subtitle">Selecciona los jugadores que participaron y llena sus estadísticas.</p>

        @if (isFinalized()) {
          <div class="finalized-banner">
            <mat-icon>lock</mat-icon>
            El resultado de este partido ya está definido. Las estadísticas son de solo lectura.
          </div>
        }

        <!-- ── PIZARRA POR ENTRADA ── -->
        <div class="inning-section">
          <div class="inning-section-header">
            <div class="inning-title-group">
              <mat-icon>scoreboard</mat-icon>
              <span>Pizarra por Entrada</span>
            </div>
          </div>

          @if (innings().length > 0) {
            @let curr = innings()[currentIdx()];
            @let isTop = currentHalf() === 'top';
            @let halfOuts = isTop ? curr.topOuts : curr.bottomOuts;
            @let halfRuns = isTop ? curr.topRuns : curr.bottomRuns;
            @let isHome = game()?.isHomeTeam ?? true;

            <!-- Entrada actual -->
            <div class="current-inning-card">

              <!-- Navegación de medias entradas -->
              <div class="inning-nav-row">
                <button mat-icon-button title="Media entrada anterior"
                        [disabled]="currentIdx() === 0 && isTop"
                        (click)="prevHalfInning()">
                  <mat-icon>arrow_back</mat-icon>
                </button>
                <div class="inning-nav-title-group">
                  <span class="inning-nav-title">Entrada {{ currentIdx() + 1 }}</span>
                  <span class="half-chip" [class.chip-top]="isTop" [class.chip-bottom]="!isTop">
                    {{ isTop ? 'ALTA' : 'BAJA' }}
                  </span>
                </div>
                <button mat-icon-button title="Siguiente media entrada"
                        [disabled]="isFinalized() && currentIdx() === innings().length - 1 && !isTop"
                        (click)="goToNextHalf()">
                  <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>

              <!-- Media entrada activa -->
              <div class="half-section" [class.half-done]="halfOuts >= 3">
                <div class="half-header">
                  <div class="half-title-group">
                    <span class="half-label" [class.label-top]="isTop" [class.label-bottom]="!isTop">
                      {{ isTop ? 'ALTA' : 'BAJA' }}
                    </span>
                    <span class="batting-info">{{ isOurTurn() ? 'Nosotros bateamos' : 'Rival batea' }}</span>
                  </div>
                  @if (halfOuts >= 3) {
                    <span class="half-done-badge">3 Outs ✓</span>
                  }
                </div>
                <div class="half-body">
                  <div class="runs-ctrl">
                    <button mat-icon-button class="btn-minus"
                            [disabled]="isFinalized() || halfRuns === 0"
                            (click)="adjustRuns(-1)">
                      <mat-icon>remove</mat-icon>
                    </button>
                    <span class="big-run-val" [class.opp-val]="!isOurTurn()">{{ halfRuns }}</span>
                    <button mat-icon-button class="btn-plus"
                            [disabled]="isFinalized()"
                            (click)="adjustRuns(1)">
                      <mat-icon>add</mat-icon>
                    </button>
                  </div>
                  <div class="outs-row">
                    <div class="out-dots-row">
                      @for (dot of [0,1,2]; track dot) {
                        <span class="out-dot" [class.filled]="halfOuts > dot"></span>
                      }
                    </div>
                    <div class="outs-ctrl">
                      <button mat-icon-button class="btn-minus sm"
                              [disabled]="isFinalized() || halfOuts === 0"
                              (click)="adjustOuts(-1)">
                        <mat-icon>remove</mat-icon>
                      </button>
                      <span class="outs-text">{{ halfOuts }}<small>/3</small></span>
                      <button mat-icon-button class="btn-plus sm"
                              [disabled]="isFinalized() || halfOuts >= 3"
                              (click)="adjustOuts(1)">
                        <mat-icon>add</mat-icon>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Totales -->
            <div class="innings-totals-row">
              <span class="total-badge badge-us">Nos.: <strong>{{ totalRuns() }}</strong></span>
              <span class="total-badge badge-opp">Rival: <strong>{{ totalOpponentRuns() }}</strong></span>
            </div>

            <!-- Resumen de todas las entradas -->
            @if (innings().length > 1) {
              <div class="innings-history">
                <div class="history-scroll">
                  <div class="history-row h-header">
                    <span class="h-label"></span>
                    @for (inn of innings(); track $index; let i = $index) {
                      <span class="h-cell" [class.h-current]="i === currentIdx()">E{{ i + 1 }}</span>
                    }
                    <span class="h-cell h-tot">Tot.</span>
                  </div>
                  <div class="history-row h-us">
                    <span class="h-label">Nos.</span>
                    @for (inn of innings(); track $index; let i = $index) {
                      <span class="h-cell" [class.h-current]="i === currentIdx()">
                        {{ isHome ? inn.bottomRuns : inn.topRuns }}
                      </span>
                    }
                    <span class="h-cell h-tot">{{ totalRuns() }}</span>
                  </div>
                  <div class="history-row h-opp">
                    <span class="h-label">Rival</span>
                    @for (inn of innings(); track $index; let i = $index) {
                      <span class="h-cell" [class.h-current]="i === currentIdx()">
                        {{ isHome ? inn.topRuns : inn.bottomRuns }}
                      </span>
                    }
                    <span class="h-cell h-tot">{{ totalOpponentRuns() }}</span>
                  </div>
                </div>
              </div>
            }
          }
        </div>
        <!-- ── FIN PIZARRA ── -->

        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Buscar jugador</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [ngModel]="searchText()" (ngModelChange)="searchText.set($event)" placeholder="Nombre o número...">
          @if (searchText()) {
            <button matSuffix mat-icon-button (click)="searchText.set('')">
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>

        @if (includedFiltered().length > 0) {
          <div class="players-section-header">
            <mat-icon>group</mat-icon>
            En este partido ({{ includedFiltered().length }})
          </div>
          @for (entry of includedFiltered(); track entry.player.id) {
            <mat-card class="player-card included">
              <mat-card-header>
                <div class="player-header">
                  <div class="player-info">
                    @if (entry.form.get('battingOrder')?.value) {
                      <span class="order-badge">{{ entry.form.get('battingOrder')?.value }}°</span>
                    }
                    <span class="number-badge">#{{ entry.player.number }}</span>
                    <span class="player-name">{{ entry.player.name }}</span>
                    <span class="position-badge">{{ entry.form.get('gamePosition')?.value || entry.player.position }}</span>
                    @if (entry.saved) {
                      <mat-icon class="saved-icon" title="Guardado">check_circle</mat-icon>
                    }
                  </div>
                  <div class="include-actions">
                    <button mat-stroked-button color="warn" (click)="exclude(entry)" [disabled]="isFinalized()">
                      <mat-icon>remove</mat-icon> Excluir
                    </button>
                  </div>
                </div>
              </mat-card-header>

              <mat-card-content>
                <form [formGroup]="entry.form">

                  <!-- LINEUP -->
                  <div class="lineup-row">
                    <div class="lineup-item">
                      <span class="lineup-label">Turno al bate</span>
                      <div class="counter-row">
                        <button mat-icon-button class="btn-minus sm" [disabled]="isFinalized() || entry.form.get('battingOrder')?.value <= 0" (click)="adjustBattingOrder(entry, -1)">
                          <mat-icon>remove</mat-icon>
                        </button>
                        <span class="batting-order-val">{{ entry.form.get('battingOrder')?.value || '—' }}</span>
                        <button mat-icon-button class="btn-plus sm" [disabled]="isFinalized() || entry.form.get('battingOrder')?.value >= 9" (click)="adjustBattingOrder(entry, 1)">
                          <mat-icon>add</mat-icon>
                        </button>
                      </div>
                    </div>
                    <div class="lineup-item lineup-position">
                      <span class="lineup-label">Posición en el partido</span>
                      <div class="position-chips-row">
                        @for (pos of positions; track pos.value) {
                          <button class="pos-chip"
                                  [class.pos-active]="entry.form.get('gamePosition')?.value === pos.value"
                                  [disabled]="isFinalized()"
                                  (click)="setGamePosition(entry, pos.value)">{{ pos.value }}</button>
                        }
                      </div>
                    </div>
                  </div>

                  <mat-tab-group>
                    <!-- BATEO -->
                    <mat-tab label="Bateo">
                      <div class="tab-section" formGroupName="batting">
                        <div class="ab-display">
                          <mat-icon>sports_baseball</mat-icon>
                          Turnos al bate (AB): <strong>{{ calcAB(entry.form) }}</strong>
                        </div>
                        <div class="counters-grid">
                          <div class="counter-item">
                            <span class="counter-label">H — Hits</span>
                            <div class="counter-row">
                              <button mat-icon-button class="btn-minus" [disabled]="isFinalized()" (click)="adjust(entry, 'batting', 'H', -1)"><mat-icon>remove</mat-icon></button>
                              <span class="counter-value">{{ entry.form.get('batting.H')?.value }}</span>
                              <button mat-icon-button class="btn-plus" [disabled]="isFinalized()" (click)="adjust(entry, 'batting', 'H', 1)"><mat-icon>add</mat-icon></button>
                            </div>
                          </div>
                          <div class="counter-item">
                            <span class="counter-label">HR — Home Runs</span>
                            <div class="counter-row">
                              <button mat-icon-button class="btn-minus" [disabled]="isFinalized()" (click)="adjust(entry, 'batting', 'HR', -1)"><mat-icon>remove</mat-icon></button>
                              <span class="counter-value">{{ entry.form.get('batting.HR')?.value }}</span>
                              <button mat-icon-button class="btn-plus" [disabled]="isFinalized()" (click)="adjust(entry, 'batting', 'HR', 1)"><mat-icon>add</mat-icon></button>
                            </div>
                          </div>
                          <div class="counter-item">
                            <span class="counter-label">RBI</span>
                            <div class="counter-row">
                              <button mat-icon-button class="btn-minus" [disabled]="isFinalized()" (click)="adjust(entry, 'batting', 'RBI', -1)"><mat-icon>remove</mat-icon></button>
                              <span class="counter-value">{{ entry.form.get('batting.RBI')?.value }}</span>
                              <button mat-icon-button class="btn-plus" [disabled]="isFinalized()" (click)="adjust(entry, 'batting', 'RBI', 1)"><mat-icon>add</mat-icon></button>
                            </div>
                          </div>
                          <div class="counter-item">
                            <span class="counter-label">BB — Bases x Bolas</span>
                            <div class="counter-row">
                              <button mat-icon-button class="btn-minus" [disabled]="isFinalized()" (click)="adjust(entry, 'batting', 'BB', -1)"><mat-icon>remove</mat-icon></button>
                              <span class="counter-value">{{ entry.form.get('batting.BB')?.value }}</span>
                              <button mat-icon-button class="btn-plus" [disabled]="isFinalized()" (click)="adjust(entry, 'batting', 'BB', 1)"><mat-icon>add</mat-icon></button>
                            </div>
                          </div>
                          <div class="counter-item">
                            <span class="counter-label">SO — Ponches</span>
                            <div class="counter-row">
                              <button mat-icon-button class="btn-minus" [disabled]="isFinalized()" (click)="adjust(entry, 'batting', 'SO', -1)"><mat-icon>remove</mat-icon></button>
                              <span class="counter-value">{{ entry.form.get('batting.SO')?.value }}</span>
                              <button mat-icon-button class="btn-plus" [disabled]="isFinalized()" (click)="adjust(entry, 'batting', 'SO', 1)"><mat-icon>add</mat-icon></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </mat-tab>
                    @if (entry.form.get('gamePosition')?.value === 'P') {
                      <mat-tab label="Pitcheo">
                        <div class="tab-section" formGroupName="pitching">
                          <div class="counters-grid">
                            <div class="counter-item">
                              <span class="counter-label">BB — Bases x Bolas</span>
                              <div class="counter-row">
                                <button mat-icon-button class="btn-minus" [disabled]="isFinalized()" (click)="adjust(entry, 'pitching', 'BB', -1)"><mat-icon>remove</mat-icon></button>
                                <span class="counter-value">{{ entry.form.get('pitching.BB')?.value }}</span>
                                <button mat-icon-button class="btn-plus" [disabled]="isFinalized()" (click)="adjust(entry, 'pitching', 'BB', 1)"><mat-icon>add</mat-icon></button>
                              </div>
                            </div>
                            <div class="counter-item">
                              <span class="counter-label">SO — Ponchados</span>
                              <div class="counter-row">
                                <button mat-icon-button class="btn-minus" [disabled]="isFinalized()" (click)="adjust(entry, 'pitching', 'SO', -1)"><mat-icon>remove</mat-icon></button>
                                <span class="counter-value">{{ entry.form.get('pitching.SO')?.value }}</span>
                                <button mat-icon-button class="btn-plus" [disabled]="isFinalized()" (click)="adjust(entry, 'pitching', 'SO', 1)"><mat-icon>add</mat-icon></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </mat-tab>
                    }
                    <!-- FIELDING -->
                    <mat-tab label="Fielding">
                      <div class="tab-section" formGroupName="fielding">
                        <div class="counters-grid">
                          <div class="counter-item">
                            <span class="counter-label">Errores</span>
                            <div class="counter-row">
                              <button mat-icon-button class="btn-minus" [disabled]="isFinalized()" (click)="adjust(entry, 'fielding', 'errors', -1)"><mat-icon>remove</mat-icon></button>
                              <span class="counter-value">{{ entry.form.get('fielding.errors')?.value }}</span>
                              <button mat-icon-button class="btn-plus" [disabled]="isFinalized()" (click)="adjust(entry, 'fielding', 'errors', 1)"><mat-icon>add</mat-icon></button>
                            </div>
                          </div>
                          <div class="counter-item">
                            <span class="counter-label">Outs</span>
                            <div class="counter-row">
                              <button mat-icon-button class="btn-minus" [disabled]="isFinalized()" (click)="adjust(entry, 'fielding', 'outs', -1)"><mat-icon>remove</mat-icon></button>
                              <span class="counter-value">{{ entry.form.get('fielding.outs')?.value }}</span>
                              <button mat-icon-button class="btn-plus" [disabled]="isFinalized()" (click)="adjust(entry, 'fielding', 'outs', 1)"><mat-icon>add</mat-icon></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </mat-tab>
                  </mat-tab-group>
                </form>
              </mat-card-content>
            </mat-card>
          }
        }

        @if (notIncludedFiltered().length > 0) {
          <div class="players-section-header not-included-header">
            <mat-icon>person_add</mat-icon>
            Resto del equipo ({{ notIncludedFiltered().length }})
          </div>
          @for (entry of notIncludedFiltered(); track entry.player.id) {
            <mat-card class="player-card" [class.included]="entry.included">
            <mat-card-header>
              <div class="player-header">
                <div class="player-info">
                  <span class="number-badge">#{{ entry.player.number }}</span>
                  <span class="player-name">{{ entry.player.name }}</span>
                  <span class="position-badge">{{ entry.player.position }}</span>
                  @if (entry.saved) {
                    <mat-icon class="saved-icon" title="Guardado">check_circle</mat-icon>
                  }
                </div>
                <div class="include-actions">
                  @if (!entry.included) {
                    <button mat-stroked-button color="primary" (click)="include(entry)" [disabled]="isFinalized()">
                      <mat-icon>add</mat-icon> Incluir
                    </button>
                  } @else {
                    <button mat-stroked-button color="warn" (click)="exclude(entry)" [disabled]="isFinalized()">
                      <mat-icon>remove</mat-icon> Excluir
                    </button>
                  }
                </div>
              </div>
            </mat-card-header>

            @if (entry.included) {
              <mat-card-content>
                <form [formGroup]="entry.form">
                  <mat-tab-group>

                    <!-- BATEO -->
                    <mat-tab label="Bateo">
                      <div class="tab-section" formGroupName="batting">
                        <div class="ab-display">
                          <mat-icon>sports_baseball</mat-icon>
                          Turnos al bate (AB): <strong>{{ calcAB(entry.form) }}</strong>
                        </div>
                        <div class="counters-grid">
                          <div class="counter-item">
                            <span class="counter-label">H — Hits</span>
                            <div class="counter-row">
                              <button mat-icon-button class="btn-minus" [disabled]="isFinalized()" (click)="adjust(entry, 'batting', 'H', -1)">
                                <mat-icon>remove</mat-icon>
                              </button>
                              <span class="counter-value">{{ entry.form.get('batting.H')?.value }}</span>
                              <button mat-icon-button class="btn-plus" [disabled]="isFinalized()" (click)="adjust(entry, 'batting', 'H', 1)">
                                <mat-icon>add</mat-icon>
                              </button>
                            </div>
                          </div>
                          <div class="counter-item">
                            <span class="counter-label">HR — Home Runs</span>
                            <div class="counter-row">
                              <button mat-icon-button class="btn-minus" [disabled]="isFinalized()" (click)="adjust(entry, 'batting', 'HR', -1)">
                                <mat-icon>remove</mat-icon>
                              </button>
                              <span class="counter-value">{{ entry.form.get('batting.HR')?.value }}</span>
                              <button mat-icon-button class="btn-plus" [disabled]="isFinalized()" (click)="adjust(entry, 'batting', 'HR', 1)">
                                <mat-icon>add</mat-icon>
                              </button>
                            </div>
                          </div>
                          <div class="counter-item">
                            <span class="counter-label">RBI</span>
                            <div class="counter-row">
                              <button mat-icon-button class="btn-minus" [disabled]="isFinalized()" (click)="adjust(entry, 'batting', 'RBI', -1)">
                                <mat-icon>remove</mat-icon>
                              </button>
                              <span class="counter-value">{{ entry.form.get('batting.RBI')?.value }}</span>
                              <button mat-icon-button class="btn-plus" [disabled]="isFinalized()" (click)="adjust(entry, 'batting', 'RBI', 1)">
                                <mat-icon>add</mat-icon>
                              </button>
                            </div>
                          </div>
                          <div class="counter-item">
                            <span class="counter-label">BB — Bases x Bolas</span>
                            <div class="counter-row">
                              <button mat-icon-button class="btn-minus" [disabled]="isFinalized()" (click)="adjust(entry, 'batting', 'BB', -1)">
                                <mat-icon>remove</mat-icon>
                              </button>
                              <span class="counter-value">{{ entry.form.get('batting.BB')?.value }}</span>
                              <button mat-icon-button class="btn-plus" [disabled]="isFinalized()" (click)="adjust(entry, 'batting', 'BB', 1)">
                                <mat-icon>add</mat-icon>
                              </button>
                            </div>
                          </div>
                          <div class="counter-item">
                            <span class="counter-label">SO — Ponches</span>
                            <div class="counter-row">
                              <button mat-icon-button class="btn-minus" [disabled]="isFinalized()" (click)="adjust(entry, 'batting', 'SO', -1)">
                                <mat-icon>remove</mat-icon>
                              </button>
                              <span class="counter-value">{{ entry.form.get('batting.SO')?.value }}</span>
                              <button mat-icon-button class="btn-plus" [disabled]="isFinalized()" (click)="adjust(entry, 'batting', 'SO', 1)">
                                <mat-icon>add</mat-icon>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </mat-tab>

                    @if (entry.form.get('gamePosition')?.value === 'P') {
                      <mat-tab label="Pitcheo">
                        <div class="tab-section" formGroupName="pitching">
                          <div class="counters-grid">
                            <div class="counter-item">
                              <span class="counter-label">BB — Bases x Bolas</span>
                              <div class="counter-row">
                                <button mat-icon-button class="btn-minus" [disabled]="isFinalized()" (click)="adjust(entry, 'pitching', 'BB', -1)">
                                  <mat-icon>remove</mat-icon>
                                </button>
                                <span class="counter-value">{{ entry.form.get('pitching.BB')?.value }}</span>
                                <button mat-icon-button class="btn-plus" [disabled]="isFinalized()" (click)="adjust(entry, 'pitching', 'BB', 1)">
                                  <mat-icon>add</mat-icon>
                                </button>
                              </div>
                            </div>
                            <div class="counter-item">
                              <span class="counter-label">SO — Ponchados</span>
                              <div class="counter-row">
                                <button mat-icon-button class="btn-minus" [disabled]="isFinalized()" (click)="adjust(entry, 'pitching', 'SO', -1)">
                                  <mat-icon>remove</mat-icon>
                                </button>
                                <span class="counter-value">{{ entry.form.get('pitching.SO')?.value }}</span>
                                <button mat-icon-button class="btn-plus" [disabled]="isFinalized()" (click)="adjust(entry, 'pitching', 'SO', 1)">
                                  <mat-icon>add</mat-icon>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </mat-tab>
                    }

                    <!-- FIELDING -->
                    <mat-tab label="Fielding">
                      <div class="tab-section" formGroupName="fielding">
                        <div class="counters-grid">
                          <div class="counter-item">
                            <span class="counter-label">Errores</span>
                            <div class="counter-row">
                              <button mat-icon-button class="btn-minus" [disabled]="isFinalized()" (click)="adjust(entry, 'fielding', 'errors', -1)">
                                <mat-icon>remove</mat-icon>
                              </button>
                              <span class="counter-value">{{ entry.form.get('fielding.errors')?.value }}</span>
                              <button mat-icon-button class="btn-plus" [disabled]="isFinalized()" (click)="adjust(entry, 'fielding', 'errors', 1)">
                                <mat-icon>add</mat-icon>
                              </button>
                            </div>
                          </div>
                          <div class="counter-item">
                            <span class="counter-label">Outs</span>
                            <div class="counter-row">
                              <button mat-icon-button class="btn-minus" [disabled]="isFinalized()" (click)="adjust(entry, 'fielding', 'outs', -1)">
                                <mat-icon>remove</mat-icon>
                              </button>
                              <span class="counter-value">{{ entry.form.get('fielding.outs')?.value }}</span>
                              <button mat-icon-button class="btn-plus" [disabled]="isFinalized()" (click)="adjust(entry, 'fielding', 'outs', 1)">
                                <mat-icon>add</mat-icon>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </mat-tab>

                  </mat-tab-group>
                </form>
              </mat-card-content>
            }
          </mat-card>
        }
        }

      }
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 900px; margin: 0 auto; }
    .loading-center { display: flex; justify-content: center; padding: 80px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; flex-wrap: wrap; gap: 8px; }
    .page-header > div:first-child { display: flex; align-items: center; gap: 4px; }
    .page-header h1 { margin: 0; font-size: 1.3rem; }
    .game-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .info-chip { background: var(--blue-bg); color: var(--blue); padding: 4px 12px; border-radius: 16px; font-size: 0.85rem; }
    .score-chip { background: var(--red-bg); color: var(--red); padding: 4px 12px; border-radius: 16px; font-weight: 700; }
    .result-badge { padding: 4px 14px; border-radius: 16px; font-weight: 700; }
    .result-W { background: #e8f5e9; color: #2e7d32; }
    .result-L { background: var(--red-bg); color: var(--red); }
    .result-T { background: #fff3e0; color: #e65100; }
    .result-- { background: #f5f5f5; color: #999; }
    .subtitle { color: #666; margin-bottom: 8px; font-size: 0.9rem; }
    .finalized-banner {
      display: flex; align-items: center; gap: 10px;
      background: #FFF3E0; color: #E65100;
      border: 1.5px solid #FFCC80;
      border-radius: 10px; padding: 12px 16px;
      font-size: 0.9rem; font-weight: 500;
      margin-bottom: 16px;
    }
    .finalized-banner mat-icon { flex-shrink: 0; }
    .search-field { width: 100%; margin-bottom: 12px; }

    .players-section-header {
      display: flex; align-items: center; gap: 8px;
      font-size: 0.85rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.5px; color: var(--red);
      padding: 6px 4px; margin-bottom: 8px; margin-top: 4px;
      border-bottom: 2px solid var(--red-bg);
    }
    .players-section-header mat-icon { font-size: 18px; height: 18px; width: 18px; }
    .not-included-header { color: #888; border-bottom-color: #e0e0e0; margin-top: 16px; }
    .not-included-header mat-icon { color: #888; }

    .player-card { margin-bottom: 12px; border-left: 4px solid #e0e0e0; }
    .player-card.included { border-left-color: var(--red); }
    .player-header { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 8px 0; gap: 8px; flex-wrap: wrap; }
    .player-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .order-badge { background: #1a237e; color: white; padding: 2px 8px; border-radius: 12px; font-weight: 800; font-size: 0.82rem; white-space: nowrap; }
    .number-badge { background: var(--red); color: white; padding: 2px 10px; border-radius: 12px; font-weight: 700; white-space: nowrap; }
    .player-name { font-size: 1rem; font-weight: 600; color: var(--black); }
    .position-badge { background: var(--blue-bg); color: var(--blue); padding: 2px 10px; border-radius: 12px; font-size: 0.82rem; }
    .saved-icon { color: #2e7d32; font-size: 20px; height: 20px; width: 20px; }

    /* Lineup row */
    .lineup-row {
      display: flex; flex-wrap: wrap; gap: 16px;
      padding: 12px; margin: 12px 0 4px;
      background: #f8faff; border-radius: 10px;
      border: 1px solid #e3eaf7;
    }
    .lineup-item { display: flex; flex-direction: column; gap: 6px; }
    .lineup-label { font-size: 0.72rem; font-weight: 700; color: #777; text-transform: uppercase; letter-spacing: 0.5px; }
    .batting-order-val { font-size: 1.5rem; font-weight: 800; min-width: 36px; text-align: center; color: var(--black); }
    .lineup-position { flex: 1; min-width: 180px; }
    .position-chips-row { display: flex; flex-wrap: wrap; gap: 4px; }
    .pos-chip {
      padding: 3px 8px; border-radius: 8px; border: 1.5px solid #dde;
      background: white; font-size: 0.78rem; font-weight: 700; color: #666;
      cursor: pointer; transition: all 0.15s; line-height: 1.5;
    }
    .pos-chip:hover:not(:disabled) { border-color: var(--blue); color: var(--blue); background: var(--blue-bg); }
    .pos-chip.pos-active { background: var(--blue); color: white; border-color: var(--blue); }
    .pos-chip:disabled { opacity: 0.5; cursor: default; }

    /* Tab content */
    .tab-section { padding: 16px 8px 8px; }

    /* AB auto-calculated display */
    .ab-display {
      display: flex; align-items: center; gap: 8px;
      background: var(--blue-bg); color: var(--blue);
      border-radius: 10px; padding: 10px 16px;
      font-size: 0.95rem; margin-bottom: 16px;
    }
    .ab-display mat-icon { font-size: 18px; height: 18px; width: 18px; }
    .ab-display strong { font-size: 1.2rem; margin-left: 4px; }

    /* Counters */
    .counters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 12px;
    }
    .counter-item {
      background: #fafafa; border: 1px solid #e8e8e8;
      border-radius: 12px; padding: 12px 8px;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    .counter-label {
      font-size: 0.78rem; font-weight: 600;
      color: #555; text-align: center; line-height: 1.2;
    }
    .counter-row {
      display: flex; align-items: center; gap: 4px;
    }
    .counter-value {
      font-size: 1.6rem; font-weight: 700; color: var(--black);
      min-width: 40px; text-align: center; line-height: 1;
    }
    .btn-minus, .btn-plus {
      border-radius: 50% !important;
      width: 36px !important; height: 36px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      line-height: 1 !important;
    }
    .btn-minus { color: var(--red) !important; background: var(--red-bg) !important; }
    .btn-plus  { color: var(--blue) !important; background: var(--blue-bg) !important; }

    /* ── Pizarra por Entrada ── */
    .inning-section {
      background: white; border: 1px solid #e0e0e0;
      border-radius: 16px; padding: 16px; margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .inning-section-header {
      display: flex; align-items: center; margin-bottom: 14px;
    }
    .inning-title-group {
      display: flex; align-items: center; gap: 8px;
      font-weight: 700; font-size: 1rem; color: var(--blue);
    }
    .inning-title-group mat-icon { color: var(--blue); }

    /* Card de entrada actual */
    .current-inning-card {
      background: #f8faff; border: 2px solid var(--blue);
      border-radius: 14px; padding: 12px; margin-bottom: 14px;
      display: flex; flex-direction: column; align-items: stretch; gap: 0;
    }

    /* Navegación de entradas */
    .inning-nav-row {
      display: flex; align-items: center; gap: 8px;
      justify-content: center; margin-bottom: 10px;
    }
    .inning-nav-title-group {
      display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 110px;
    }
    .inning-nav-title {
      font-size: 0.9rem; font-weight: 800; color: var(--blue);
      text-transform: uppercase; letter-spacing: 1px; text-align: center;
    }
    .half-chip {
      font-size: 0.65rem; font-weight: 800; text-transform: uppercase;
      letter-spacing: 1px; padding: 1px 10px; border-radius: 10px;
    }
    .chip-top    { background: var(--red-bg);  color: var(--red);  }
    .chip-bottom { background: var(--blue-bg); color: var(--blue); }

    /* Mitades alta / baja */
    .half-section {
      border-radius: 10px; padding: 10px 12px;
      transition: background 0.2s;
    }
    .half-section.half-done { background: #f1f8e9; }
    .half-header {
      display: flex; flex-direction: column; align-items: center; margin-bottom: 8px; gap: 4px;
    }
    .half-title-group { display: flex; align-items: center; justify-content: center; gap: 8px; }
    .half-label {
      font-size: 0.7rem; font-weight: 800; text-transform: uppercase;
      letter-spacing: 1px; padding: 2px 10px; border-radius: 10px;
    }
    .label-top    { background: var(--red-bg);  color: var(--red);  }
    .label-bottom { background: var(--blue-bg); color: var(--blue); }
    .batting-info { font-size: 0.78rem; color: #888; font-style: italic; }
    .half-done-badge {
      font-size: 0.7rem; font-weight: 700; color: #388e3c;
      background: #e8f5e9; padding: 2px 8px; border-radius: 10px;
    }
    .half-body { display: flex; flex-direction: column; align-items: center; gap: 14px; }

    .runs-ctrl { display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; }
    .big-run-val {
      font-size: 2.2rem; font-weight: 900; min-width: 44px;
      text-align: center; line-height: 1; color: var(--black);
    }
    .opp-val { color: var(--red); }

    /* Outs */
    .outs-row { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 100%; }
    .out-dots-row { display: flex; gap: 5px; }
    .out-dot {
      width: 12px; height: 12px; border-radius: 50%;
      border: 2px solid #bbb; background: transparent; transition: all 0.15s;
    }
    .out-dot.filled { background: #ef5350; border-color: #ef5350; }
    .outs-ctrl { display: flex; align-items: center; gap: 2px; }
    .outs-text {
      font-size: 1rem; font-weight: 700; min-width: 30px;
      text-align: center; color: #555;
    }
    .outs-text small { font-size: 0.7rem; color: #aaa; }

    /* Totales */
    .innings-totals-row {
      display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap;
    }
    .total-badge {
      display: flex; align-items: baseline; gap: 5px;
      border-radius: 20px; padding: 5px 14px; font-size: 0.85rem;
    }
    .total-badge strong { font-size: 1.3rem; font-weight: 800; line-height: 1; }
    .badge-us  { background: var(--blue-bg); color: var(--blue); }
    .badge-us strong { color: var(--blue); }
    .badge-opp { background: var(--red-bg); color: var(--red); }
    .badge-opp strong { color: var(--red); }

    /* Historial */
    .innings-history { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .history-scroll { display: inline-block; min-width: 100%; }
    .history-row {
      display: flex; align-items: center;
      border-radius: 6px; margin-bottom: 2px;
    }
    .h-header { background: #f0f0f0; }
    .h-us   { background: var(--blue-bg); }
    .h-opp  { background: var(--red-bg); }
    .h-label {
      width: 42px; min-width: 42px; padding: 5px 6px;
      font-size: 0.75rem; font-weight: 700; color: #666; flex-shrink: 0;
    }
    .h-us .h-label { color: var(--blue); }
    .h-opp .h-label { color: var(--red); }
    .h-cell {
      min-width: 32px; padding: 5px 4px;
      font-size: 0.8rem; font-weight: 600; text-align: center; color: #444; flex-shrink: 0;
    }
    .h-header .h-cell { color: #888; font-size: 0.72rem; }
    .h-us .h-cell   { color: var(--blue); }
    .h-opp .h-cell  { color: var(--red); }
    .h-tot {
      font-weight: 800; font-size: 0.88rem; border-left: 1px solid rgba(0,0,0,0.1);
      margin-left: 4px; padding-left: 8px;
    }
    .h-current {
      font-weight: 800; background: rgba(0,0,0,0.08);
      border-radius: 4px; outline: 1px solid rgba(0,0,0,0.12);
    }

    /* small icon buttons */
    .sm { width: 28px !important; height: 28px !important; line-height: 1 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; }
    .sm mat-icon { font-size: 16px !important; width: 16px !important; height: 16px !important; line-height: 1 !important; }

    @media (max-width: 600px) {
      .page-container { padding: 12px; }
      .page-header h1 { font-size: 1.1rem; }
      .counters-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
      .current-runs-row { gap: 8px; }
      .big-run-val { font-size: 1.8rem; }
    }
  `]
})
export class GameDetailComponent implements OnInit {
  private route         = inject(ActivatedRoute);
  private router        = inject(Router);
  private fb            = inject(FormBuilder);
  private gameService   = inject(GameService);
  private playerService = inject(PlayerService);
  private statsService  = inject(StatsService);
  private snackBar      = inject(MatSnackBar);

  readonly positions = POSITIONS;

  game    = signal<Game | null>(null);
  entries = signal<PlayerEntry[]>([]);
  loading = signal(true);
  searchText = signal('');
  private gameId = '';
  private playerTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private inningTimer: ReturnType<typeof setTimeout> | null = null;

  innings           = signal<InningScore[]>([]);
  currentIdx        = signal(0);
  currentHalf       = signal<'top' | 'bottom'>('top');

  totalRuns = computed(() => {
    const isHome = this.game()?.isHomeTeam ?? true;
    return this.innings().reduce((sum, inn) => sum + (isHome ? inn.bottomRuns : inn.topRuns), 0);
  });
  totalOpponentRuns = computed(() => {
    const isHome = this.game()?.isHomeTeam ?? true;
    return this.innings().reduce((sum, inn) => sum + (isHome ? inn.topRuns : inn.bottomRuns), 0);
  });
  isOurTurn = computed(() => {
    const isHome = this.game()?.isHomeTeam ?? true;
    return isHome ? this.currentHalf() === 'bottom' : this.currentHalf() === 'top';
  });

  isFinalized = computed(() => this.game()?.result !== '-');

  filteredEntries = computed(() => {
    const q = this.searchText().toLowerCase().trim();
    const all = q
      ? this.entries().filter(e =>
          e.player.name.toLowerCase().includes(q) ||
          e.player.number.toString().includes(q)
        )
      : this.entries();
    return all;
  });

  includedFiltered = computed(() => {
    const included = this.filteredEntries().filter(e => e.included);
    return [...included].sort((a, b) => {
      const oa = a.form.get('battingOrder')?.value || 0;
      const ob = b.form.get('battingOrder')?.value || 0;
      if (oa === 0 && ob === 0) return 0;
      if (oa === 0) return 1;
      if (ob === 0) return -1;
      return oa - ob;
    });
  });

  notIncludedFiltered = computed(() =>
    this.filteredEntries().filter(e => !e.included)
  );

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap(params => {
        this.gameId = params.get('id')!;
        return combineLatest([
          this.gameService.getAll(),
          this.playerService.getAll(),
          this.statsService.getByGame(this.gameId),
        ]);
      })
    ).subscribe(([games, players, existingStats]) => {
      const game = games.find(g => g.id === this.gameId);
      if (!game) { this.router.navigate(['/games']); return; }
      this.game.set(game);

      const existingInnings = game.innings;
      const migrate = (raw: any): InningScore => ({
        topRuns:    raw.topRuns    ?? (raw.opponentRuns ?? 0),
        topOuts:    raw.topOuts    ?? (raw.outs ?? 0),
        bottomRuns: raw.bottomRuns ?? (raw.runs ?? 0),
        bottomOuts: raw.bottomOuts ?? 0,
      });
      const loaded = existingInnings && existingInnings.length > 0
        ? existingInnings.map(migrate)
        : [{ topRuns: 0, topOuts: 0, bottomRuns: 0, bottomOuts: 0 }];
      const lastIdx = loaded.length - 1;
      this.innings.set(loaded);
      this.currentIdx.set(lastIdx);
      this.currentHalf.set(loaded[lastIdx].topOuts >= 3 ? 'bottom' : 'top');

      const statsMap = new Map(existingStats.map(s => [s.playerId, s]));
      const entries: PlayerEntry[] = players
        .filter(p => p.active)
        .map(player => {
          const existing = statsMap.get(player.id!);
          return { player, form: this.buildForm(player, existing), included: !!existing, saved: !!existing };
        });

      this.entries.set(entries);
      this.loading.set(false);
    });
  }

  private buildForm(player: Player, existing?: PlayerGameStats): FormGroup {
    const b = existing?.batting  ?? emptyBatting();
    const p = existing?.pitching ?? emptyPitching();
    const f = existing?.fielding ?? emptyFielding();
    return this.fb.group({
      battingOrder: [existing?.battingOrder ?? 0],
      gamePosition: [existing?.gamePosition ?? player.position],
      batting:  this.fb.group({ H: [b.H], HR: [b.HR], RBI: [b.RBI], BB: [b.BB], SO: [b.SO] }),
      pitching: this.fb.group({ BB: [p.BB], SO: [p.SO] }),
      fielding: this.fb.group({ errors: [f.errors], outs: [f.outs] }),
    });
  }

  adjust(entry: PlayerEntry, group: string, field: string, delta: 1 | -1) {
    const ctrl = entry.form.get(`${group}.${field}`)!;
    ctrl.setValue(Math.max(0, (ctrl.value ?? 0) + delta));
    this.scheduleSave(entry);
  }

  adjustBattingOrder(entry: PlayerEntry, delta: 1 | -1) {
    const ctrl = entry.form.get('battingOrder')!;
    ctrl.setValue(Math.min(9, Math.max(0, (ctrl.value ?? 0) + delta)));
    this.scheduleSave(entry);
  }

  setGamePosition(entry: PlayerEntry, pos: string) {
    entry.form.get('gamePosition')!.setValue(pos);
    this.scheduleSave(entry);
  }

  calcAB(form: FormGroup): number {
    const b = form.get('batting')?.value;
    return (b.H ?? 0) + (b.HR ?? 0) + (b.BB ?? 0) + (b.SO ?? 0);
  }

  private scheduleSave(entry: PlayerEntry) {
    if (!entry.included) return;
    const id = entry.player.id!;
    const prev = this.playerTimers.get(id);
    if (prev) clearTimeout(prev);
    const timer = setTimeout(() => {
      this.saveEntry(entry);
      this.playerTimers.delete(id);
    }, 1200);
    this.playerTimers.set(id, timer);
  }

  private scheduleInningsSave() {
    if (this.inningTimer) clearTimeout(this.inningTimer);
    this.inningTimer = setTimeout(() => {
      this.saveInnings();
      this.inningTimer = null;
    }, 1000);
  }

  include(entry: PlayerEntry) {
    entry.included = true;
    this.entries.set([...this.entries()]);
    this.saveEntry(entry);
  }

  exclude(entry: PlayerEntry) {
    if (entry.saved) {
      if (!confirm('¿Remover las estadísticas de este jugador del partido?')) return;
      this.statsService.deletePlayerGameStats(this.gameId, entry.player.id!);
      entry.saved = false;
    }
    entry.included = false;
    entry.form = this.buildForm(entry.player);
    this.entries.set([...this.entries()]);
  }

  private async saveEntry(entry: PlayerEntry) {
    const val = entry.form.value;
    const AB  = this.calcAB(entry.form);
    const stats: PlayerGameStats = {
      gameId:         this.gameId,
      playerId:       entry.player.id!,
      playerName:     entry.player.name,
      playerNumber:   entry.player.number,
      playerPosition: entry.player.position,
      battingOrder:   val.battingOrder || undefined,
      gamePosition:   val.gamePosition || undefined,
      batting:  { AB, ...val.batting },
      pitching: val.pitching,
      fielding: val.fielding,
    };
    await this.statsService.savePlayerGameStats(stats);
    entry.saved = true;
    this.entries.set([...this.entries()]);
  }

  adjustRuns(delta: number) {
    const arr = [...this.innings()];
    const i = this.currentIdx();
    if (i < 0 || i >= arr.length) return;
    const inn = { ...arr[i] };
    if (this.currentHalf() === 'top') inn.topRuns    = Math.max(0, inn.topRuns    + delta);
    else                              inn.bottomRuns = Math.max(0, inn.bottomRuns + delta);
    arr[i] = inn;
    this.innings.set(arr);
    this.scheduleInningsSave();
  }

  adjustOuts(delta: number) {
    const arr = [...this.innings()];
    const i = this.currentIdx();
    if (i < 0 || i >= arr.length) return;
    const inn = { ...arr[i] };
    const half = this.currentHalf();
    if (half === 'top') inn.topOuts    = Math.max(0, Math.min(3, inn.topOuts    + delta));
    else                inn.bottomOuts = Math.max(0, Math.min(3, inn.bottomOuts + delta));
    arr[i] = inn;
    this.innings.set(arr);
    if (half === 'top'    && inn.topOuts    === 3) {
      this.snackBar.open('¡3 outs! Turno de batear.', '', { duration: 1800 });
      setTimeout(() => this.goToNextHalf(), 900);
    }
    if (half === 'bottom' && inn.bottomOuts === 3) {
      this.snackBar.open('¡3 outs! Siguiente entrada.', '', { duration: 1800 });
      setTimeout(() => this.goToNextHalf(), 900);
    }
    this.scheduleInningsSave();
  }

  prevHalfInning() {
    if (this.currentHalf() === 'bottom') {
      this.currentHalf.set('top');
    } else if (this.currentIdx() > 0) {
      this.currentIdx.set(this.currentIdx() - 1);
      this.currentHalf.set('bottom');
    }
  }

  goToNextHalf() {
    if (this.currentHalf() === 'top') {
      this.currentHalf.set('bottom');
      return;
    }
    const nextIdx = this.currentIdx() + 1;
    if (nextIdx < this.innings().length) {
      this.currentIdx.set(nextIdx);
      this.currentHalf.set('top');
    } else {
      const newArr = [...this.innings(), { topRuns: 0, topOuts: 0, bottomRuns: 0, bottomOuts: 0 }];
      this.innings.set(newArr);
      this.currentIdx.set(newArr.length - 1);
      this.currentHalf.set('top');
      this.scheduleInningsSave();
    }
  }

  private async saveInnings() {
    const teamScore     = this.totalRuns();
    const opponentScore = this.totalOpponentRuns();
    await this.gameService.update(this.gameId, { innings: this.innings(), teamScore, opponentScore });
    this.game.set({ ...this.game()!, innings: this.innings(), teamScore, opponentScore });
  }

  back() {
    this.router.navigate(['/games']);
  }
}
