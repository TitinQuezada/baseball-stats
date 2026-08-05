import { Component, inject, computed } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavbarComponent } from './shared/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, CommonModule],
  template: `
    @if (showNavbar()) {
      <app-navbar></app-navbar>
    }
    <main [class]="showNavbar() ? 'app-main' : 'app-main-full'">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    .app-main      { min-height: calc(100vh - 64px); background: var(--bg, #F4F6F9); }
    .app-main-full { min-height: 100vh; }
  `]
})
export class App {
  private router = inject(Router);

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  showNavbar = computed(() => {
    const url = this.currentUrl();
    return !url.startsWith('/login') && !url.startsWith('/fondo');
  });
}
