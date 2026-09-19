import { registerDecorator, type ValidationOptions } from 'class-validator';

// Kleine Denyliste bekannter Standard-/Leak-Passwörter. Ersetzt keinen vollen
// Breach-Corpus-Abgleich (z.B. Have-I-Been-Pwned-API), vermeidet aber eine
// externe Netzwerkabhängigkeit für dieses lokale Tool. Siehe Issue #33.
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
