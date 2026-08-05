import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, doc, docData,
  addDoc, deleteDoc, query, orderBy,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { Payment, FundExpense, DEFAULT_SEASON_START } from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private firestore = inject(Firestore);
  private paymentsCol = collection(this.firestore, 'payments');
  private expensesCol = collection(this.firestore, 'fund_expenses');

  /** Lee la fecha de inicio de temporada desde Firestore (config/season → startDate).
   *  Si el documento no existe, usa DEFAULT_SEASON_START como fallback. */
  getSeasonConfig(): Observable<string> {
    return (docData(doc(this.firestore, 'config', 'season')) as Observable<{ startDate?: string } | undefined>).pipe(
      map(data => data?.startDate ?? DEFAULT_SEASON_START),
    );
  }

  getAllPayments(): Observable<Payment[]> {
    return collectionData(
      query(this.paymentsCol, orderBy('date', 'desc')),
      { idField: 'id' },
    ) as Observable<Payment[]>;
  }

  addPayment(payment: Omit<Payment, 'id'>): Promise<void> {
    return addDoc(this.paymentsCol, payment).then(() => {});
  }

  deletePayment(id: string): Promise<void> {
    return deleteDoc(doc(this.firestore, 'payments', id));
  }

  getAllExpenses(): Observable<FundExpense[]> {
    return collectionData(
      query(this.expensesCol, orderBy('date', 'desc')),
      { idField: 'id' },
    ) as Observable<FundExpense[]>;
  }

  addExpense(expense: Omit<FundExpense, 'id'>): Promise<void> {
    return addDoc(this.expensesCol, expense).then(() => {});
  }

  deleteExpense(id: string): Promise<void> {
    return deleteDoc(doc(this.firestore, 'fund_expenses', id));
  }
}
