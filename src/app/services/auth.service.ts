import { Injectable, inject, signal } from '@angular/core';
import {
  Auth, signInWithEmailAndPassword, signOut,
  updatePassword, reauthenticateWithCredential,
  EmailAuthProvider, onAuthStateChanged, User,
  GoogleAuthProvider, signInWithPopup,
} from '@angular/fire/auth';
import {
  Firestore, collection, query, where, getDocs,
} from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth      = inject(Auth);
  private firestore = inject(Firestore);

  currentUser = signal<User | null>(null);
  loading     = signal(true);

  constructor() {
    onAuthStateChanged(this.auth, user => {
      this.currentUser.set(user);
      this.loading.set(false);
    });
  }

  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const result   = await signInWithPopup(this.auth, provider);

    const allowed = await this.isAllowed(result.user.email!);
    if (!allowed) {
      await signOut(this.auth);
      throw { code: 'auth/not-authorized' };
    }
    return result;
  }

  logout() {
    return signOut(this.auth);
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const user = this.auth.currentUser;
    if (!user?.email) throw new Error('No hay sesión activa');
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  }

  private async isAllowed(email: string): Promise<boolean> {
    const snap = await getDocs(
      query(
        collection(this.firestore, 'allowedUsers'),
        where('email',  '==', email),
        where('active', '==', true),
      )
    );
    return !snap.empty;
  }
}
