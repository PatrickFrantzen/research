import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { LadeZustand } from '../../core/lade-zustand/lade-zustand.js';

type Art = 'aktivitaet' | 'fehler';

@Component({
  selector: 'app-protokolle',
  imports: [LadeZustand, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatSelectModule, RouterLink],
  templateUrl: './protokolle.html',
  styleUrl: './protokolle.scss',
})
export class Protokolle {
  private readonly http = inject(HttpClient);

  protected readonly tage = rxResource({
    stream: () => this.http.get<{ tage: string[] }>('/api/v1/protokoll'),
  });
  protected readonly tagListe = computed(() => (this.tage.hasValue() ? this.tage.value().tage : []));
  protected readonly tag = linkedSignal(() => this.tagListe()[0] ?? null);
  protected readonly art = signal<Art>('aktivitaet');

  protected readonly url = computed(() => {
    const tag = this.tag();
    return tag ? `/api/v1/protokoll/${this.art()}/${tag}` : null;
  });

  protected readonly inhalt = rxResource({
    params: () => this.url() ?? undefined,
    stream: ({ params: url }) => this.http.get(url, { responseType: 'text' }),
  });

  // Neueste Zeile zuerst: beim Nachsehen interessiert meist das Letzte.
  protected readonly zeilen = computed(() =>
    this.inhalt.hasValue() ? this.inhalt.value().split('\n').filter(Boolean).reverse() : [],
  );
}
