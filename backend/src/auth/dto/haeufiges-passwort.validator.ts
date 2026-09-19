import { registerDecorator, type ValidationOptions } from 'class-validator';

// Kleine Denyliste bekannter Standard-/Leak-Passwörter. Bewusst KEIN echter
// Breach-Corpus-Abgleich (z.B. Have-I-Been-Pwned-API mit k-Anonymity) - das
// würde eine externe Netzwerkabhängigkeit beim Passwort-Setzen einführen
// (Verfügbarkeit/Latenz/Datenschutz-Tradeoff), die für dieses kleine, lokal
// betriebene Tool bewusst nicht eingegangen wird. Diese Liste ist eine
// symbolische Grundhärtung gegen die offensichtlichsten Passwörter, kein
// Ersatz für einen vollständigen Leak-Abgleich. Siehe Issues #33, #42.
const HAEUFIGE_PASSWOERTER = new Set([
  'password123456',
  '123456789012',
  'qwertyuiopas',
  'passwortpasswort',
  '111111111111',
  'aaaaaaaaaaaa',
]);

export function IstKeinHaeufigesPasswort(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'istKeinHaeufigesPasswort',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value !== 'string' || !HAEUFIGE_PASSWOERTER.has(value.toLowerCase());
        },
        defaultMessage(): string {
          return 'Dieses Passwort ist zu bekannt/unsicher, bitte ein anderes wählen.';
        },
      },
    });
  };
}
