// Beim Docker-Build per `ng build --define` gesetzt (Commit · Build-Datum),
// in Entwicklung und Tests nicht vorhanden.
declare const APP_VERSION: string | undefined;

export const appVersion: string = typeof APP_VERSION === 'string' ? APP_VERSION : 'dev';
