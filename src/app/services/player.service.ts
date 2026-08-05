import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Player } from '../models/player.model';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private firestore = inject(Firestore);
  private col = collection(this.firestore, 'players');

  getAll(): Observable<Player[]> {
    return collectionData(query(this.col, orderBy('number')), { idField: 'id' }) as Observable<Player[]>;
  }

  add(player: Omit<Player, 'id'>): Promise<void> {
    return addDoc(this.col, player).then(() => {});
  }

  update(id: string, player: Partial<Player>): Promise<void> {
    return updateDoc(doc(this.firestore, 'players', id), player);
  }

  delete(id: string): Promise<void> {
    return deleteDoc(doc(this.firestore, 'players', id));
  }
}
