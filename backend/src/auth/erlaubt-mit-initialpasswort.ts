// Passwortwechsel beim ersten Login ist Pflicht (Issue #76): Solange ein
// Nutzer noch sein Initialpasswort hat (mussPasswortSetzen), lehnt
// JwtAuthGuard alle Endpunkte ab, die nicht hiermit markiert sind.
import { SetMetadata } from '@nestjs/common';

export const ERLAUBT_MIT_INITIALPASSWORT = 'erlaubtMitInitialpasswort';

export const ErlaubtMitInitialpasswort = () => SetMetadata(ERLAUBT_MIT_INITIALPASSWORT, true);
