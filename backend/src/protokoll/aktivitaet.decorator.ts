import { SetMetadata } from '@nestjs/common';

export const AKTIVITAET = 'protokoll:aktivitaet';

// Markiert einen Endpunkt, dessen Erfolg ins Aktivitäts-Log gehört.
export const Aktivitaet = (aktion: string) => SetMetadata(AKTIVITAET, aktion);
