import { initializeApp } from 'firebase-admin/app';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { runPaymentReminders } from './reminders';

initializeApp();

const whatsappAccessToken = defineSecret('WHATSAPP_ACCESS_TOKEN');
const whatsappPhoneNumberId = defineSecret('WHATSAPP_PHONE_NUMBER_ID');

/** Corre todos los lunes a las 09:00 (America/Santo_Domingo) y envia recordatorios
 *  de pago por WhatsApp a los jugadores que superen el umbral configurado en
 *  config/whatsapp. Ver functions/src/reminders.ts para la logica completa. */
export const weeklyPaymentReminders = onSchedule(
  {
    schedule: 'every monday 09:00',
    timeZone: 'America/Santo_Domingo',
    secrets: [whatsappAccessToken, whatsappPhoneNumberId],
  },
  async () => {
    await runPaymentReminders({
      accessToken: whatsappAccessToken.value(),
      phoneNumberId: whatsappPhoneNumberId.value(),
    });
  },
);

/** Version manual de weeklyPaymentReminders para el boton "Enviar recordatorios
 *  ahora" en la pagina de Settings. Requiere que el usuario este autenticado. */
export const sendWhatsAppRemindersNow = onCall(
  { secrets: [whatsappAccessToken, whatsappPhoneNumberId] },
  async request => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesion para enviar recordatorios.');
    }
    return runPaymentReminders({
      accessToken: whatsappAccessToken.value(),
      phoneNumberId: whatsappPhoneNumberId.value(),
    });
  },
);
