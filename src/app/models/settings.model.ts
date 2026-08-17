export const DEFAULT_WHATSAPP_CONFIG: WhatsAppConfig = {
  enabled: false,
  weeksDebtThreshold: 2,
  templateName: 'recordatorio_de_pago',
  languageCode: 'es',
  sendDaysOfWeek: [1],
};

export interface WhatsAppConfig {
  enabled: boolean;
  /** Se notifica a los jugadores cuyo weeksDebt sea mayor a este valor */
  weeksDebtThreshold: number;
  /** Nombre de la plantilla aprobada en Meta WhatsApp Business */
  templateName: string;
  /** Codigo de idioma de la plantilla en Meta (ej. 'es', 'es_MX', 'es_AR') */
  languageCode: string;
  /** Dias de la semana en que se ejecuta el envio automatico (0 = domingo ... 6 = sabado).
   *  El envio corre todos los dias a las 09:00 (America/Santo_Domingo) pero solo actua
   *  si el dia actual esta incluido aqui. */
  sendDaysOfWeek: number[];
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
  /** ID del mensaje devuelto por Meta al aceptar el envio, usado por el webhook
   *  para correlacionar las actualizaciones de estado de entrega. */
  messageId?: string;
  /** Estado real de entrega reportado por el webhook de Meta: delivered, read o failed. */
  deliveryStatus?: string;
  /** Motivo del fallo de entrega reportado por el webhook de Meta, si aplica. */
  deliveryError?: string;
}
