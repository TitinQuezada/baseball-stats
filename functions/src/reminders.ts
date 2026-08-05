import { getFirestore } from 'firebase-admin/firestore';
import { computePlayerDebt, getEffectiveStartDate, getWeeksOwed, SeasonPayment } from './debt-calc';
import { sendTemplateMessage, WhatsAppCredentials } from './whatsapp-client';

const DEFAULT_SEASON_START = '2026-06-01';
const WEEKLY_FEE = 50;

interface Player {
  id: string;
  name: string;
  number: number;
  active: boolean;
  phone?: string;
  joinedAt?: string;
}

interface Payment {
  playerId: string;
  amount: number;
  date: string;
}

interface WhatsAppConfig {
  enabled: boolean;
  weeksDebtThreshold: number;
  templateName: string;
}

export interface RemindersSummary {
  sent: number;
  failed: number;
  skipped: number;
}

/** Logica principal: lee config y datos de Firestore, calcula deuda por jugador,
 *  y envia un recordatorio de WhatsApp a los que superan el umbral configurado,
 *  evitando reenviar mas de una vez por semana al mismo jugador. */
export async function runPaymentReminders(credentials: WhatsAppCredentials): Promise<RemindersSummary> {
  const db = getFirestore();
  const summary: RemindersSummary = { sent: 0, failed: 0, skipped: 0 };

  const [seasonDoc, whatsappDoc] = await Promise.all([
    db.doc('config/season').get(),
    db.doc('config/whatsapp').get(),
  ]);

  const seasonStartDate = (seasonDoc.data()?.['startDate'] as string | undefined) ?? DEFAULT_SEASON_START;
  const whatsappConfig: WhatsAppConfig = {
    enabled: whatsappDoc.data()?.['enabled'] ?? false,
    weeksDebtThreshold: whatsappDoc.data()?.['weeksDebtThreshold'] ?? 2,
    templateName: whatsappDoc.data()?.['templateName'] ?? 'recordatorio_de_pago',
  };

  if (!whatsappConfig.enabled) {
    console.log('Recordatorios de WhatsApp deshabilitados en config/whatsapp, no se envia nada.');
    return summary;
  }

  const weekBucket = getWeeksOwed(seasonStartDate);

  const [playersSnap, paymentsSnap] = await Promise.all([
    db.collection('players').where('active', '==', true).get(),
    db.collection('payments').where('date', '>=', seasonStartDate).get(),
  ]);

  const players = playersSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Player);
  const seasonPayments = paymentsSnap.docs.map(d => d.data() as Payment);

  const paymentsByPlayer = new Map<string, SeasonPayment[]>();
  for (const payment of seasonPayments) {
    const list = paymentsByPlayer.get(payment.playerId) ?? [];
    list.push({ amount: payment.amount, date: payment.date });
    paymentsByPlayer.set(payment.playerId, list);
  }

  const candidates = players
    .filter(p => !!p.phone)
    .map(p => {
      // Si el jugador se agrego despues del inicio de temporada, debe cuota
      // recien desde esa fecha, no desde el dia 1 de la temporada.
      const effectiveStart = getEffectiveStartDate(seasonStartDate, p.joinedAt);
      const weeksOwed = getWeeksOwed(effectiveStart);
      const playerPayments = (paymentsByPlayer.get(p.id) ?? []).filter(pay => pay.date >= effectiveStart);
      const debt = computePlayerDebt(playerPayments, weeksOwed, WEEKLY_FEE);
      return { player: p, debt };
    })
    .filter(({ debt }) => debt.weeksDebt > whatsappConfig.weeksDebtThreshold);

  for (const { player, debt } of candidates) {
    const existing = await db.collection('whatsapp_notifications')
      .where('playerId', '==', player.id)
      .where('weekBucket', '==', weekBucket)
      .limit(1)
      .get();

    if (!existing.empty) {
      summary.skipped++;
      continue;
    }

    try {
      await sendTemplateMessage(
        credentials,
        player.phone!,
        whatsappConfig.templateName,
        { nombre: player.name, monto: String(debt.debtAmount) },
      );
      summary.sent++;
      await db.collection('whatsapp_notifications').add({
        playerId: player.id,
        playerName: player.name,
        phone: player.phone,
        weeksDebt: debt.weeksDebt,
        weekBucket,
        sentAt: new Date().toISOString(),
        status: 'sent',
      });
    } catch (err) {
      summary.failed++;
      console.error(`Fallo el envio a ${player.name} (${player.phone}):`, err instanceof Error ? err.message : err);
      await db.collection('whatsapp_notifications').add({
        playerId: player.id,
        playerName: player.name,
        phone: player.phone,
        weeksDebt: debt.weeksDebt,
        weekBucket,
        sentAt: new Date().toISOString(),
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await db.doc('config/whatsapp').set({ lastRunAt: new Date().toISOString() }, { merge: true });

  console.log(`Recordatorios de pago: enviados=${summary.sent} fallidos=${summary.failed} omitidos=${summary.skipped}`);
  return summary;
}
