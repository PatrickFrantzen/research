import { HttpClient } from '@angular/common/http';
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';

interface HealthResponse {
  status: 'ok' | 'error';
  database: 'ok' | 'error';
  objectStorage: 'ok' | 'error';
}

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.scss',
})
export class App {
  private readonly http = inject(HttpClient);

  protected readonly health = signal<HealthResponse | 'loading' | 'error'>('loading');

  constructor() {
    this.http.get<HealthResponse>('/api/v1/health').subscribe({
      next: (response) => this.health.set(response),
      error: () => this.health.set('error'),
    });
  }
}
