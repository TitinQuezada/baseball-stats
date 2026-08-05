export interface BattingStats {
  AB: number;   // At Bats
  H: number;    // Hits
  HR: number;   // Home Runs
  RBI: number;  // Runs Batted In
  BB: number;   // Base on Balls (Walks)
  SO: number;   // Strikeouts
}

export interface PitchingStats {
  BB: number;   // Bases por Bolas
  SO: number;   // Ponchados
}

export interface FieldingStats {
  errors: number;
  outs: number;
}

export interface PlayerGameStats {
  id?: string;
  gameId: string;
  playerId: string;
  playerName: string;
  playerNumber: number;
  playerPosition: string;
  battingOrder?: number;
  gamePosition?: string;
  batting: BattingStats;
  pitching: PitchingStats;
  fielding: FieldingStats;
}

export interface PlayerSeasonStats {
  playerId: string;
  playerName: string;
  playerNumber: number;
  playerPosition: string;
  gamesPlayed: number;
  batting: BattingStats;
  pitching: PitchingStats;
  fielding: FieldingStats;
  avg: number;  // Batting Average calculated
}

export const emptyBatting = (): BattingStats => ({ AB: 0, H: 0, HR: 0, RBI: 0, BB: 0, SO: 0 });
export const emptyPitching = (): PitchingStats => ({ BB: 0, SO: 0 });
export const emptyFielding = (): FieldingStats => ({ errors: 0, outs: 0 });
