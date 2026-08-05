import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, addDoc, updateDoc, deleteDoc, query, orderBy, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Game } from '../models/game.model';

@Injectable({ providedIn: 'root' })
export class GameService {
  private firestore = inject(Firestore);
  private col = collection(this.firestore, 'games');

  getAll(): Observable<Game[]> {
    return collectionData(query(this.col, orderBy('date', 'desc')), { idField: 'id' }) as Observable<Game[]>;
  }

  getBySeason(season: string): Observable<Game[]> {
    return collectionData(
      query(this.col, where('season', '==', season), orderBy('date', 'desc')),
      { idField: 'id' }
    ) as Observable<Game[]>;
  }

  add(game: Omit<Game, 'id'>): Promise<void> {
    return addDoc(this.col, game).then(() => {});
  }

  update(id: string, game: Partial<Game>): Promise<void> {
    return updateDoc(doc(this.firestore, 'games', id), game);
  }

  delete(id: string): Promise<void> {
    return deleteDoc(doc(this.firestore, 'games', id));
  }
}
