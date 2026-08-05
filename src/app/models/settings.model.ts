export const DEFAULT_WHATSAPP_CONFIG: WhatsAppConfig = {
  enabled: false,
  weeksDebtThreshold: 2,
  templateName: 'recordatorio_de_pago',
};

export interface WhatsAppConfig {
  enabled: boolean;
  /** Se notifica a los jugadores cuyo weeksDebt sea mayor a este valor */
  weeksDebtThreshold: number;
  /** Nombre de la plantilla aprobada en Meta WhatsApp Business */
  templateName: string;
  /** Informativo, lo escribe la Cloud Function en cada corrida */
  lastRunAt?: string;
}

export interface WhatsAppNotification {
  id?: string;
  playerId: string;
  playerName: string;
  phone: string;
  weeksDebt: number;
  weekBucket: number;
  sentAt: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
}
