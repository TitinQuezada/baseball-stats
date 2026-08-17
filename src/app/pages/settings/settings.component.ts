import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { SettingsService } from '../../services/settings.service';
import { WhatsAppNotification } from '../../models/settings.model';

interface SendRemindersResult {
  sent: number;
  failed: number;
  skipped: number;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatButtonModule,
    MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule,
    MatSnackBarModule, MatDividerModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1><mat-icon>settings</mat-icon> Configuración</h1>
      </div>

      <mat-card class="settings-card">
        <mat-card-content>
          <h2>Recordatorios de pago por WhatsApp</h2>
          <p class="hint">
            Envía un mensaje de WhatsApp a los jugadores activos cuyas semanas de cuota
            adeudadas superen el umbral configurado. Requiere una plantilla aprobada en
            Meta WhatsApp Business.
          </p>

          <form [formGroup]="form" class="settings-form">
            <mat-slide-toggle formControlName="enabled" color="primary">
              Envío automático activado
            </mat-slide-toggle>

            <mat-form-field appearance="outline">
              <mat-label>Umbral de semanas adeudadas</mat-label>
              <input matInput type="number" formControlName="weeksDebtThreshold" min="0">
              <mat-hint>Se notifica cuando la deuda supera este número de semanas</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Nombre de la plantilla (Meta)</mat-label>
              <input matInput formControlName="templateName" placeholder="recordatorio_de_pago">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Código de idioma de la plantilla</mat-label>
              <input matInput formControlName="languageCode" placeholder="es">
              <mat-hint>Tal cual figura en Meta (ej. es, es_MX, es_AR)</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Días de envío</mat-label>
              <mat-select formControlName="sendDaysOfWeek" multiple>
                @for (day of weekDays; track day.value) {
                  <mat-option [value]="day.value">{{ day.label }}</mat-option>
                }
              </mat-select>
              <mat-hint>Se revisa todos los días a las 9:00am (hora RD) y solo se envía en los días seleccionados</mat-hint>
            </mat-form-field>
          </form>
        </mat-card-content>
        <mat-card-actions align="end">
          <button mat-button [disabled]="sending()" (click)="sendNow()">
            <mat-icon>send</mat-icon> Enviar recordatorios ahora
          </button>
          <button mat-raised-button color="primary" [disabled]="form.invalid || saving()" (click)="save()">
            <mat-icon>save</mat-icon> Guardar
          </button>
        </mat-card-actions>
      </mat-card>

      @if (recentNotifications().length > 0) {
        <mat-card class="settings-card">
          <mat-card-content>
            <h2>Últimos envíos</h2>
            <div class="data-list">
              @for (n of recentNotifications(); track n.id) {
                <div class="list-item">
                  <div class="li-body">
                    <div class="li-row1">
                      <span class="li-player">{{ n.playerName }}</span>
                      <span class="li-status" [class.status-failed]="n.status === 'failed'">
                        {{ n.status === 'sent' ? 'Enviado' : 'Falló' }}
                      </span>
                      @if (n.status === 'sent' && n.deliveryStatus) {
                        <span class="li-delivery" [class.status-failed]="n.deliveryStatus === 'failed'">
                          {{ deliveryStatusLabel(n.deliveryStatus) }}
                        </span>
                      }
                    </div>
                    <div class="li-row2">
                      <span class="li-date">{{ n.sentAt | date:'short' }}</span>
                      <span>{{ n.weeksDebt }} semanas adeudadas</span>
                      @if (n.errorMessage) {
                        <span class="li-error">{{ n.errorMessage }}</span>
                      }
                      @if (n.deliveryError) {
                        <span class="li-error">{{ n.deliveryError }}</span>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 700px; margin: 0 auto; }
    .page-header { margin-bottom: 20px; }
    .page-header h1 { display: flex; align-items: center; gap: 8px; margin: 0; }
    .settings-card { border-radius: 12px !important; margin-bottom: 20px; }
    .settings-card h2 { font-size: 1.05rem; margin: 0 0 8px; }
    .hint { font-size: 0.85rem; color: #666; margin: 0 0 16px; }
    .settings-form { display: flex; flex-direction: column; gap: 12px; }

    .data-list { display: flex; flex-direction: column; }
    .list-item { padding: 10px 4px; border-bottom: 1px solid #f0f0f0; }
    .li-row1 { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }
    .li-row2 { display: flex; gap: 12px; font-size: 0.78rem; color: #888; flex-wrap: wrap; }
    .li-player { font-weight: 600; font-size: 0.92rem; }
    .li-status { font-size: 0.78rem; font-weight: 600; color: #2e7d32; }
    .li-status.status-failed { color: #C62828; }
    .li-delivery { font-size: 0.72rem; font-weight: 600; color: #666; }
    .li-delivery.status-failed { color: #C62828; }
    .li-error { color: #C62828; }
  `],
})
export class SettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private settingsService = inject(SettingsService);
  private functions = inject(Functions);
  private snackBar = inject(MatSnackBar);

  saving = signal(false);
  sending = signal(false);
  recentNotifications = signal<WhatsAppNotification[]>([]);

  weekDays = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
  ];
  form = this.fb.group({
    enabled: [false],
    weeksDebtThreshold: [2, [Validators.required, Validators.min(0)]],
    templateName: ['recordatorio_de_pago', Validators.required],
    languageCode: ['es', Validators.required],
    sendDaysOfWeek: [[1] as number[], Validators.required],
  });

  ngOnInit() {
    this.settingsService.getWhatsAppConfig().subscribe(config => {
      this.form.patchValue(config, { emitEvent: false });
    });
    this.settingsService.getRecentNotifications().subscribe(list => this.recentNotifications.set(list));
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const { enabled, weeksDebtThreshold, templateName, languageCode, sendDaysOfWeek } = this.form.getRawValue();
    this.settingsService.updateWhatsAppConfig({
      enabled: !!enabled,
      weeksDebtThreshold: weeksDebtThreshold ?? 0,
      templateName: templateName ?? '',
      languageCode: languageCode ?? 'es',
      sendDaysOfWeek: sendDaysOfWeek?.length ? sendDaysOfWeek : [1],
    }).then(
      () => {
        this.saving.set(false);
        this.snackBar.open('Configuración guardada', 'OK', { duration: 2500 });
      },
      () => {
        this.saving.set(false);
        this.snackBar.open('Error al guardar la configuración', 'OK', { duration: 3000 });
      },
    );
  }

  deliveryStatusLabel(status: string): string {
    switch (status) {
      case 'delivered': return 'Entregado';
      case 'read': return 'Leído';
      case 'failed': return 'Entrega fallida';
      default: return status;
    }
  }

  sendNow() {
    this.sending.set(true);
    const sendReminders = httpsCallable<void, SendRemindersResult>(this.functions, 'sendWhatsAppRemindersNow');
    sendReminders().then(
      result => {
        this.sending.set(false);
        const { sent, failed, skipped } = result.data;
        this.snackBar.open(
          `Enviados: ${sent} · Fallidos: ${failed} · Omitidos: ${skipped}`,
          'OK',
          { duration: 4000 },
        );
      },
      err => {
        this.sending.set(false);
        this.snackBar.open(`Error al enviar: ${err.message ?? err}`, 'OK', { duration: 4000 });
      },
    );
  }
}
