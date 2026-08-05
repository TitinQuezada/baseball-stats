import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, doc, docData,
  setDoc, query, orderBy, limit,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { DEFAULT_WHATSAPP_CONFIG, WhatsAppConfig, WhatsAppNotification } from '../models/settings.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private firestore = inject(Firestore);
  private notificationsCol = collection(this.firestore, 'whatsapp_notifications');

  getWhatsAppConfig(): Observable<WhatsAppConfig> {
    return (docData(doc(this.firestore, 'config', 'whatsapp')) as Observable<Partial<WhatsAppConfig> | undefined>).pipe(
      map(data => ({ ...DEFAULT_WHATSAPP_CONFIG, ...data })),
    );
  }

  updateWhatsAppConfig(config: Partial<WhatsAppConfig>): Promise<void> {
    return setDoc(doc(this.firestore, 'config', 'whatsapp'), config, { merge: true });
  }

  getRecentNotifications(max = 20): Observable<WhatsAppNotification[]> {
    return collectionData(
      query(this.notificationsCol, orderBy('sentAt', 'desc'), limit(max)),
      { idField: 'id' },
    ) as Observable<WhatsAppNotification[]>;
  }
}
