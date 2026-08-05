const GRAPH_API_VERSION = 'v21.0';

export interface WhatsAppCredentials {
  accessToken: string;
  phoneNumberId: string;
}

/** Envia un mensaje de plantilla aprobada por Meta a un numero de WhatsApp.
 *  `to` debe estar en formato E.164 sin '+' (ej. 18091234567).
 *  `bodyParams` son los valores de las variables con nombre del cuerpo de la
 *  plantilla, ej. { nombre: 'Juan', monto: '150' } para una plantilla con
 *  {{nombre}} y {{monto}}. */
export async function sendTemplateMessage(
  credentials: WhatsAppCredentials,
  to: string,
  templateName: string,
  bodyParams: Record<string, string>,
): Promise<void> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${credentials.phoneNumberId}/messages`;
  const paramEntries = Object.entries(bodyParams);

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
        language: { code: 'es' },
        components: paramEntries.length > 0 ? [
          {
            type: 'body',
            parameters: paramEntries.map(([parameter_name, text]) => ({ type: 'text', parameter_name, text })),
          },
        ] : undefined,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Meta WhatsApp API error (${response.status}): ${errorBody}`);
  }
}
