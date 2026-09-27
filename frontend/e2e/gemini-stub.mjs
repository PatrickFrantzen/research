// Ersatz für die Gemini-REST-API im E2E-Stack (Issues #93, #94): antwortet
// auf jede Anfrage mit einer festen Analyse, damit der komplette Weg durch
// das Backend (Prüfung, Rundung, Redis-Vorschau, Speichern) ohne echten
// API-Call getestet wird. Gestartet von e2e/stack.sh.
import { createServer } from 'node:http';

const analyse = {
  fraktionen: [
    { name: 'Mineralischer Bauschutt', anteilProzent: 70.4 },
    { name: 'Holz', anteilProzent: 29.6 },
  ],
  einschaetzung: 'Überwiegend Bauschutt mit etwas Holz.',
  avvPruefung: {
    urteil: 'passt_eher_nicht',
    begruendung: 'Die Fotos zeigen Bauschutt statt Verpackungen.',
    vorgeschlagenerCode: '170107',
  },
};

createServer((request, response) => {
  request.resume().on('end', () => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(analyse) }] } }] }));
  });
}).listen(Number(process.env['GEMINI_STUB_PORT'] ?? 4010));
