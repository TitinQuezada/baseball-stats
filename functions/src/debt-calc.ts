/**
 * Copia framework-free de src/app/models/payment.model.ts (getWeeksOwed y
 * computePlayerDebt). functions/ es un proyecto Node separado del Angular
 * app y no puede importar directamente de src/app, asi que esta logica se
 * mantiene sincronizada manualmente entre ambos archivos.
 */

export interface SeasonPayment {
  amount: number;
  date: string; // 'YYYY-MM-DD'
}

export interface PlayerDebt {
  totalPaid: number;
  weeksPaid: number;
  partialAmount: number;
  weeksOwed: number;
  totalOwed: number;
  debtAmount: number;
  weeksDebt: number;
  weeksAhead: number;
}

/** startDateStr formato 'YYYY-MM-DD' */
export function getWeeksOwed(startDateStr: string, referenceDate: Date = new Date()): number {
  const [y, m, d] = startDateStr.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const ms = referenceDate.getTime() - start.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
}

/** Calcula la deuda de un jugador a partir de sus pagos de la temporada actual.
 *  seasonPayments debe venir ya filtrado por playerId y por fecha >= inicio de temporada. */
export function computePlayerDebt(
  seasonPayments: SeasonPayment[],
  weeksOwed: number,
  weeklyFee: number,
): PlayerDebt {
  const totalOwed = weeksOwed * weeklyFee;
  const totalPaid = seasonPayments.reduce((s, pay) => s + pay.amount, 0);
  const weeksPaid = Math.floor(totalPaid / weeklyFee);
  const partialAmount = totalPaid % weeklyFee;
  const debtAmount = Math.max(0, totalOwed - totalPaid);
  const weeksDebt = Math.max(0, weeksOwed - weeksPaid);
  const weeksAhead = totalPaid > totalOwed ? Math.floor((totalPaid - totalOwed) / weeklyFee) : 0;
  return { totalPaid, weeksPaid, partialAmount, weeksOwed, totalOwed, debtAmount, weeksDebt, weeksAhead };
}
