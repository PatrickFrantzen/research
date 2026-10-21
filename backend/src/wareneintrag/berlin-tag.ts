// Kalendertage zählen in Berlin, nicht in UTC: ein Eintrag von 00:30 Uhr
// gehört zum Tag seiner Ortszeit. Zeitzonenregeln (Sommerzeit) kommen aus Intl.
const BERLIN = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Berlin',
  timeZoneName: 'longOffset',
});

function versatzMs(zeitpunkt: Date): number {
  const name = BERLIN.formatToParts(zeitpunkt).find(
    (teil) => teil.type === 'timeZoneName',
  )?.value;
  const treffer = /GMT([+-])(\d{2}):(\d{2})/.exec(name ?? '');
  if (!treffer) return 0;
  const minuten = Number(treffer[2]) * 60 + Number(treffer[3]);
  return (treffer[1] === '-' ? -1 : 1) * minuten * 60_000;
}

// datum: "JJJJ-MM-TT". Zweiter Durchgang, weil der Versatz am Tagesbeginn
// (nicht um 00:00 UTC) gilt und sich am Umstellungstag dazwischen ändern kann.
export function tagesbeginnBerlin(datum: string): Date {
  const utc = Date.parse(`${datum}T00:00:00Z`);
  const ersterVersuch = new Date(utc - versatzMs(new Date(utc)));
  return new Date(utc - versatzMs(ersterVersuch));
}

export function folgetagBeginnBerlin(datum: string): Date {
  const folgetag = new Date(Date.parse(`${datum}T00:00:00Z`) + 86_400_000);
  return tagesbeginnBerlin(folgetag.toISOString().slice(0, 10));
}
