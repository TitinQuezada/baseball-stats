import { createHmac, timingSafeEqual } from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest, Request } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import type { Response } from 'express';

const whatsappWebhookVerifyToken = defineSecret('WHATSAPP_WEBHOOK_VERIFY_TOKEN');
const whatsappAppSecret = defineSecret('WHATSAPP_APP_SECRET');

/** Endpoint de webhook requerido por Meta para la API de WhatsApp Business
 *  (https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint).
 *  GET: handshake de verificacion que hace Meta al configurar la Callback URL.
 *  POST: notificaciones de eventos (estados de entrega, mensajes entrantes). */
export const whatsappWebhook = onRequest(
  { secrets: [whatsappWebhookVerifyToken, whatsappAppSecret] },
  async (req: Request, res: Response) => {
    if (req.method === 'GET') {
      handleVerification(req, res);
      return;
    }

    if (req.method === 'POST') {
      const signatureValid = isValidSignature(req);

      // Se guarda el evento crudo siempre (aunque la firma no valide) para poder
      // depurar en Firestore que esta mandando Meta realmente.
      try {
        await logWebhookEvent(req.body, signatureValid);
      } catch (err) {
        console.error('Error guardando evento de webhook:', err);
      }

      if (!signatureValid) {
        console.error('Firma invalida en webhook de WhatsApp (X-Hub-Signature-256 no coincide)');
        res.sendStatus(400);
        return;
      }

      // Responder rapido a Meta y procesar el payload aparte; Meta reintenta
      // si no recibe 200 en pocos segundos.
      res.sendStatus(200);
      handleEvent(req.body).catch(err => console.error('Error procesando webhook de WhatsApp:', err));
      return;
    }

    res.sendStatus(405);
  },
);

function handleVerification(req: Request, res: Response): void {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === whatsappWebhookVerifyToken.value()) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
}

function isValidSignature(req: Request): boolean {
  const signatureHeader = req.get('X-Hub-Signature-256');
  const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
  if (!signatureHeader || !rawBody) return false;

  const expected = 'sha256=' + createHmac('sha256', whatsappAppSecret.value()).update(rawBody).digest('hex');
  const signatureBuf = Buffer.from(signatureHeader);
  const expectedBuf = Buffer.from(expected);
  if (signatureBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(signatureBuf, expectedBuf);
}

interface WhatsAppStatusUpdate {
  id: string;
  status: string;
  errors?: { title?: string }[];
}

/** Guarda cada evento crudo que manda Meta en whatsapp_webhook_events, para
 *  poder inspeccionarlo desde Firestore y depurar si algo no encaja. */
async function logWebhookEvent(body: any, signatureValid: boolean): Promise<void> {
  const db = getFirestore();
  await db.collection('whatsapp_webhook_events').add({
    receivedAt: new Date().toISOString(),
    signatureValid,
    body: body ?? null,
  });
}

/** Actualiza whatsapp_notifications con el estado real de entrega (delivered,
 *  read, failed) que reporta Meta para cada mensaje ya enviado. */
async function handleEvent(body: any): Promise<void> {
  const db = getFirestore();
  const entries = body?.entry ?? [];

  for (const entry of entries) {
    for (const change of entry?.changes ?? []) {
      const statuses: WhatsAppStatusUpdate[] = change?.value?.statuses ?? [];
      for (const status of statuses) {
        const matching = await db.collection('whatsapp_notifications')
          .where('messageId', '==', status.id)
          .limit(1)
          .get();

        if (matching.empty) continue;

        await matching.docs[0].ref.update({
          deliveryStatus: status.status,
          ...(status.errors?.[0]?.title ? { deliveryError: status.errors[0].title } : {}),
        });
      }
    }
  }
}
