import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Nutzerverwaltung } from './nutzerverwaltung.js';

describe('Nutzerverwaltung', () => {
  let httpMock: HttpTestingController;

  const nutzer = [
    {
      id: 'admin-1',
      vorname: 'Patrick',
      nachname: 'Admin',
      email: 'admin@example.com',
      standort: 'Hauptsitz',
      istAdmin: true,
      einladungOffen: false,
      erstelltAm: '2026-09-25T00:00:00.000Z',
    },
    {
      id: 'nutzer-2',
      vorname: 'Thomas',
      nachname: 'Test',
      email: 'thomas@example.com',
      standort: 'Hauptsitz',
      istAdmin: false,
      einladungOffen: true,
      erstelltAm: '2026-09-26T00:00:00.000Z',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Nutzerverwaltung],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  async function geladen() {
    const fixture = TestBed.createComponent(Nutzerverwaltung);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/nutzer').flush(nutzer);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('listet alle Nutzer mit E-Mail und offenem Einladungsstatus', async () => {
    const fixture = await geladen();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Patrick Admin');
    expect(text).toContain('admin@example.com');
    expect(text).toContain('Thomas Test');
    expect(text).toContain('Einladung offen');
  });

  it('schickt dem gewählten Nutzer eine Passwort-Mail und bestätigt das', async () => {
    const fixture = await geladen();
    const element = fixture.nativeElement as HTMLElement;

    (element.querySelector('[data-testid="passwort-mail-nutzer-2"]') as HTMLButtonElement).click();
    const request = httpMock.expectOne('/api/v1/nutzer/nutzer-2/passwort-link');
    expect(request.request.method).toBe('POST');
    request.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('[role="status"]')?.textContent).toContain('thomas@example.com');
  });

  it('verlinkt auf Nutzer anlegen', async () => {
    const fixture = await geladen();

    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/nutzer-anlegen"]')).not.toBeNull();
  });
});
