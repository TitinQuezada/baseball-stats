export type Position = 'P' | 'C' | '1B' | '3B' | 'RF' | 'LF' | 'DH';

export interface Player {
  id?: string;
  name: string;
  number: number;
  position: Position;
  active: boolean;
  /** Numero de WhatsApp en formato E.164 sin '+' (ej. 18091234567) */
  phone?: string;
}

export const POSITIONS: { value: Position; label: string }[] = [
  { value: 'P',  label: 'Pitcher' },
  { value: 'C',  label: 'Catcher' },
  { value: '1B', label: '1ra Base' },
  { value: '3B', label: '3ra Base' },
  { value: 'RF', label: 'Right Field' },
  { value: 'LF', label: 'Left Field' },
  { value: 'DH', label: 'Bateador Designado' },
];
