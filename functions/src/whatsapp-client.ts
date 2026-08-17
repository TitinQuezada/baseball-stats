const GRAPH_API_VERSION = 'v21.0';

export interface WhatsAppCredentials {
  accessToken: string;
  phoneNumberId: string;
}

/** Envia un mensaje de plantilla aprobada por Meta a un numero de WhatsApp.
 *  `to` debe estar en formato E.164 sin '+' (ej. 18091234567).
 *  `bodyParams` son los valores posicionales de las variables del cuerpo de la
 *  plantilla, en orden: el primer elemento sustituye {{1}}, el segundo {{2}}, etc.
 *  Devuelve el message id que asigna Meta, para correlacionar despues con las
 *  actualizaciones de estado que llegan por el webhook. */
export async function sendTemplateMessage(
  credentials: WhatsAppCredentials,
  to: string,
  templateName: string,
  languageCode: string,
  bodyParams: string[],
): Promise<string | undefined> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${credentials.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: bodyParams.length > 0 ? [
          {
            type: 'body',
            parameters: bodyParams.map(text => ({ type: 'text', text })),
          },
        ] : undefined,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Meta WhatsApp API error (${response.status}): ${errorBody}`);
  }

  const responseBody = await response.json() as { messages?: { id?: string }[] };
  return responseBody.messages?.[0]?.id;
}
