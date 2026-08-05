export type GameResult = 'W' | 'L' | 'T' | '-';

export interface InningScore {
  topRuns: number;      // Entrada ALTA — Rival batea
  topOuts: number;
  bottomRuns: number;   // Entrada BAJA — Nosotros bateamos
  bottomOuts: number;
}

export interface Game {
  id?: string;
  date: string;         // ISO date string
  opponent: string;
  season: string;       // e.g. "2024", "2025"
  teamScore: number;
  opponentScore: number;
  result: GameResult;
  notes?: string;
  isHomeTeam?: boolean;
  innings?: InningScore[];
}
