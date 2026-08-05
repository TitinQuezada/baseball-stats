import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, setDoc, deleteDoc, query, where, orderBy } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { PlayerGameStats, PlayerSeasonStats, BattingStats, PitchingStats, FieldingStats, emptyBatting, emptyPitching, emptyFielding } from '../models/stats.model';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private firestore = inject(Firestore);
  private col = collection(this.firestore, 'gameStats');

  getByGame(gameId: string): Observable<PlayerGameStats[]> {
    return collectionData(
      query(this.col, where('gameId', '==', gameId)),
      { idField: 'id' }
    ) as Observable<PlayerGameStats[]>;
  }

  getByPlayer(playerId: string): Observable<PlayerGameStats[]> {
    return collectionData(
      query(this.col, where('playerId', '==', playerId), orderBy('gameId')),
      { idField: 'id' }
    ) as Observable<PlayerGameStats[]>;
  }

  getByPlayerAndSeason(playerId: string, gameIds: string[]): Observable<PlayerGameStats[]> {
    return collectionData(
      query(this.col, where('playerId', '==', playerId)),
      { idField: 'id' }
    ).pipe(
      map(stats => (stats as PlayerGameStats[]).filter(s => gameIds.includes(s.gameId)))
    );
  }

  getAllForSeason(gameIds: string[]): Observable<PlayerGameStats[]> {
    return collectionData(query(this.col), { idField: 'id' }).pipe(
      map(stats => (stats as PlayerGameStats[]).filter(s => gameIds.includes(s.gameId)))
    );
  }

  async savePlayerGameStats(stats: PlayerGameStats): Promise<void> {
    const docId = `${stats.gameId}_${stats.playerId}`;
    await setDoc(doc(this.firestore, 'gameStats', docId), stats);
  }

  async deletePlayerGameStats(gameId: string, playerId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'gameStats', `${gameId}_${playerId}`));
  }

  aggregateSeasonStats(statsList: PlayerGameStats[]): PlayerSeasonStats[] {
    const map = new Map<string, PlayerSeasonStats>();

    for (const s of statsList) {
      if (!map.has(s.playerId)) {
        map.set(s.playerId, {
          playerId: s.playerId,
          playerName: s.playerName,
          playerNumber: s.playerNumber,
          playerPosition: s.playerPosition,
          gamesPlayed: 0,
          batting: emptyBatting(),
          pitching: emptyPitching(),
          fielding: emptyFielding(),
          avg: 0,
        });
      }
      const agg = map.get(s.playerId)!;
      agg.gamesPlayed++;
      this.addBatting(agg.batting, s.batting);
      this.addPitching(agg.pitching, s.pitching);
      this.addFielding(agg.fielding, s.fielding);
    }

    for (const agg of map.values()) {
      agg.avg = agg.batting.AB > 0
        ? Math.round(((agg.batting.H + agg.batting.HR) / agg.batting.AB) * 1000) / 1000
        : 0;
    }

    return Array.from(map.values()).sort((a, b) => a.playerNumber - b.playerNumber);
  }

  private addBatting(target: BattingStats, src: BattingStats) {
    target.AB  += src.AB;
    target.H   += src.H;
    target.HR  += src.HR;
    target.RBI += src.RBI;
    target.BB  += src.BB;
    target.SO  += src.SO;
  }

  private addPitching(target: PitchingStats, src: PitchingStats) {
    target.BB += src.BB;
    target.SO += src.SO;
  }

  private addFielding(target: FieldingStats, src: FieldingStats) {
    target.errors += src.errors;
    target.outs   += src.outs;
  }
}
