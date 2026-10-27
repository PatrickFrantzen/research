import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FotoAnalyseApi } from './foto-analyse-api.js';

describe('FotoAnalyseApi', () => {
  let api: FotoAnalyseApi;
  let httpMock: HttpTestingController;
  const foto = new File(['jpeg'], 'foto.jpg', { type: 'image/jpeg' });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(FotoAnalyseApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('posts the photo for analysis and for the mail as field "foto"', () => {
    api.analysieren(foto).subscribe();
    api.senden(foto).subscribe();

    for (const url of ['/api/v1/foto-analyse', '/api/v1/foto-analyse/mail']) {
      const request = httpMock.expectOne(url);
      expect(request.request.method).toBe('POST');
      expect((request.request.body as FormData).get('foto')).toBe(foto);
      request.flush(null);
    }
  });

  it('deletes the preview when discarding', () => {
    api.verwerfen().subscribe();

    expect(httpMock.expectOne('/api/v1/foto-analyse').request.method).toBe('DELETE');
  });
});
