# Docker-Deployment: Hosting-Optionen

**Recherche-Stand: 19.09.2026.** Preise und Freikontingente können sich
ändern; die verlinkten Anbieter-Preislisten sind bei einer konkreten
Entscheidung noch einmal gegen das erwartete Lastprofil zu rechnen.

## Ausgangslage dieser Anwendung

Das Repository enthält bereits einen vollständigen Docker-Compose-Stack:

- `app`: NestJS-API und ausgelieferter Angular-PWA-Build,
- `postgres`: persistente relationale Daten,
- `minio` + `minio-init`: S3-kompatibler Fotospeicher und Bucket-/User-Setup,
- `redis`: verteilter Rate-Limit-Speicher,
- `migrate`: Prisma-Migration und initialer Daten-Seed.

Damit gibt es zwei grundsätzlich verschiedene Wege:

1. **Compose unverändert betreiben:** Ein Linux-VPS läuft mit Docker Compose.
   Datenbank, Redis und MinIO bleiben eigene Container mit Volumes. Das ist
   die einzige der unten genannten Varianten, die den vorhandenen Stack ohne
   Aufteilung vollständig übernimmt.
2. **Container-PaaS verwenden:** Der App-Container (und ggf.
   Migrations-Job) wird deployt; PostgreSQL, Redis und Objektspeicher werden
   als Managed Services oder getrennte Services betrieben. Das reduziert
   Server-Betrieb, ist aber kein unverändertes `docker compose up` und braucht
   eine produktive Konfiguration der Umgebungsvariablen.

Für Fotos darf der Container selbst nie der dauerhafte Speicher sein. Bei
PaaS-Optionen ist ein S3-kompatibler Object Store erforderlich; bei der
Compose-Variante bleibt das MinIO-Volume Teil des Backup-Konzepts.

## Vergleich: von kostenlosem Test bis Produktivbetrieb

| Option | Docker-/Stack-Fit | Kostenlos / Einstieg | Kosten- und Betriebsbild | Eignung |
| --- | --- | --- | --- | --- |
| **Render** | Dockerfile oder Registry-Image; Services werden einzeln modelliert. Managed Postgres und Redis-kompatibles Key Value verfügbar; Object Store extern. | Free Web Service: 512 MB, 750 Instanzstunden/Monat; kostenlose Postgres-DB läuft nach 30 Tagen ab und hat keine Backups. | Web-Service ab **$7/Monat** (0,5 CPU/512 MB), 1 CPU/2 GB **$25/Monat**, Disk $0,25/GB/Monat. Free schläft ein, daher nur Preview/Demo. | Sehr schnelle Demo; nicht der bevorzugte produktive Komplettstack. |
| **Koyeb** | Docker-Container werden direkt unterstützt. App, DB und zusätzliche Container getrennt; kein vollständiges Compose. | Eine kostenlose Web-Instanz (512 MB/0,1 vCPU/2 GB) und eine kostenlose Postgres-DB mit nur 5 aktiven Stunden/Monat. Web-Instanz skaliert nach 1 h ohne Traffic auf null. | Pay-as-you-go: z. B. Nano $2,68/Monat, Micro $5,36/Monat; Starter ohne Grundgebühr. | Kostenloses Ausprobieren; wegen Sleep und DB-Limit nicht für diese Produktions-App. |
| **Northflank** | Docker-/OCI-Images aus Registry oder Git; Services, Jobs, Datenbanken und Volumes separat. | Sandbox: zwei kostenlose Services, eine kostenlose DB und zwei Cron-Jobs; ausdrücklich zum Testen. | Kleinstes Compute-Profil 0,1 shared vCPU/256 MB: **$2,70/Monat**; Storage $0,15/GB/Monat, Egress $0,06/GB. | Gute PaaS-DX für Tests und containerisierte Teilsysteme; Object Storage extern ergänzen. |
| **Railway** | Dockerfile wird erkannt; Compose lässt sich als mehrere Services abbilden. | 30 Tage/$5 Trial; anschließend Free mit $1 Nutzungsbudget/Monat. | Hobby: **$5 Mindestumsatz inklusive $5 Credits**, Pro: $20 inklusive $20 Credits; danach sekundengenau. | Praktischste PaaS-Variante für einen kleinen, aufgeteilten Compose-Stack. Kostenlimits/Budgets aktiv überwachen. |
| **Fly.io** | Dockerfile und `fly.toml`; die Compose-Dienste werden als einzelne Machines/Volumes betrieben. | Kein dauerhafter Free Tier, nur Testprogramm (2 VM-Stunden oder 7 Tage). | Sekundengenaue VM-/RAM-Abrechnung; `shared-cpu-1x` mit 256 MB bei Dauerbetrieb etwa $1,94–$3,14/Monat je Region. | Gut, falls VM-nahe Kontrolle oder regionale Platzierung wichtig ist; mehr Betrieb als PaaS. |
| **Google Cloud Run** | Beliebige Container-Images, Migrations-Job als Cloud-Run-Job. Kein Compose-Stack: Cloud SQL, Memorystore und Cloud Storage ersetzen Nebencontainer. | Monatliches Freikontingent: 2 Mio. Requests, 240.000 vCPU-s, 450.000 GiB-s; Neukunden erhalten laut Pricing-Seite zusätzlich Testguthaben. | Pay-per-use; skaliert auf null. Zusätzliche Kosten insbesondere für Cloud SQL, Storage, Netzwerk/VPC und Artifact Registry einplanen. | Sehr gut für eine zustandslose App mit schwankender Nutzung und Cloud-Operations-Erfahrung. |
| **Azure Container Apps** | Serverlose Container-App, Jobs möglich; PostgreSQL, Redis und Blob/Object Storage als separate Azure-Dienste. | Pro Subscription/Monat: 180.000 vCPU-s, 360.000 GiB-s und 2 Mio. Requests kostenlos. | Verbrauchsabrechnung pro Sekunde, keine Nutzungsgebühr bei Skalierung auf null. Managed Datenservices kommen zusätzlich hinzu. | Sinnvoll, wenn der Kunde bereits Azure/Microsoft-Identitäten und Governance nutzt. |
| **AWS App Runner / AWS-Stack** | App Runner nimmt ein Container-Image; für den gesamten Stack sind RDS PostgreSQL, ElastiCache Redis und S3 zusätzliche Dienste. Alternativ kann der vorhandene Compose-Stack auf EC2 laufen. | Kein dauerhafter App-Runner-Free-Tier in der geprüften Preisquelle. | App Runner berechnet provisionierten Speicher schon im Idle (in EU/Ireland $0,007/GB-Stunde); RDS, ElastiCache, S3, Traffic und CI/CD separat. | Gute Wahl nur bei bestehender AWS-Landschaft oder klaren Unternehmensvorgaben; für kleines Projekt oft komplexer/teurer. |
| **Hetzner Cloud + Docker Compose** | **Vollständig kompatibel:** vorhandene `docker-compose.yml` auf einer Linux-VM, inklusive Postgres, Redis und MinIO. | Kein Free Tier. | In Deutschland/Finnland laut Preisstand vom 15.06.2026: CX23 (2 vCPU/4 GB/40 GB) **€5,49/Monat**, CX33 (4 vCPU/8 GB/80 GB) **€8,49/Monat**, jeweils zzgl. IPv4 und USt.; Stunden- oder Monatsabrechnung. | Beste Standardempfehlung für einen kleinen produktiven Kundenstack mit EU-Standort und voller Daten-/Compose-Kontrolle. |
| **Hetzner Cloud + Dokploy** | Dokploy wird auf derselben eigenen VM betrieben und kann Docker Compose aus Git bzw. als Raw Compose deployen; Domains/Traefik werden über UI unterstützt. | Dokploy selbst ist self-hosted; Kosten sind VM, Backups und ggf. Domain/DNS. | Gleiche Infrastrukturkosten wie VPS, ergänzt um komfortablere Deploy-/Domain-Oberfläche. | Empfohlen, wenn Compose beibehalten und Deployments ohne manuelles SSH vereinfacht werden sollen. |

## Quellen (Primärquellen)

- [Render: Docker-Deployments](https://render.com/docs/docker),
  [Free-Limits](https://render.com/docs/free) und
  [aktuelle Preise](https://render.com/pricing)
- [Koyeb: Docker-Support](https://www.koyeb.com/docs),
  [Instanzen und Free Tier](https://www.koyeb.com/docs/reference/instances)
  sowie [Pricing-FAQ](https://www.koyeb.com/docs/faqs/pricing)
- [Northflank: Docker-/OCI-Container](https://northflank.com/deploy/run-persistent-and-ephemeral-docker-containers)
  und [Pricing](https://northflank.com/pricing)
- [Railway: Dockerfile](https://docs.railway.com/builds/dockerfiles),
  [Compose](https://docs.railway.com/guides/docker-compose) und
  [Pricing](https://railway.com/pricing)
- [Fly.io: Docker-Deploy](https://fly.io/docs/launch/deploy/),
  [Free Trial](https://fly.io/docs/about/free-trial/) und
  [Pricing](https://fly.io/docs/about/pricing/)
- [Google Cloud Run: Container-Deploy](https://docs.cloud.google.com/run/docs/deploying)
  und [Pricing/Free Tier](https://cloud.google.com/run/pricing)
- [Azure Container Apps: Pricing und Free Grant](https://azure.microsoft.com/en-us/pricing/details/container-apps/)
- [AWS App Runner: Pricing](https://aws.amazon.com/apprunner/pricing/)
- [Hetzner Cloud: Server-Überblick](https://docs.hetzner.com/cloud/servers/overview/)
  und [Preisänderung vom 15.06.2026](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)
- [Dokploy: Compose-Deployment](https://docs.dokploy.com/docs/core/docker-compose/example)
  und [Domain-Integration](https://docs.dokploy.com/docs/core/docker-compose/domains)

## Empfehlung und realistische Zielbilder

### 1. Empfohlen für den ersten produktiven Kundenbetrieb: Hetzner + Compose

Eine kleine Hetzner-VM in Deutschland/Finnland, auf der der vorhandene
Compose-Stack mit einem TLS-Reverse-Proxy läuft, ist am wenigsten invasiv:
keine Architektur-Aufteilung, volle Datenkontrolle und gut kalkulierbare
Fixkosten. Wenn ein komfortablerer Release-Prozess gewünscht ist, Dokploy
auf derselben VM ergänzen; die Anwendung bleibt trotzdem transportables
Compose.

Für echte Produktion sollte eher **CX33 (8 GB RAM)** als der kleinste Tarif
eingeplant werden: Node-App, PostgreSQL, MinIO und Redis teilen sich den
Arbeitsspeicher. Die tatsächliche Größe muss vor Go-live mit dem erwarteten
Fotoaufkommen, gleichzeitigen Nutzern und einem Lasttest verifiziert werden.

### 2. Niedrigschwelliger Test: Render, Koyeb, Railway oder Northflank

Die kostenlosen Angebote sind sinnvoll für eine Demo. Sie sind keine sichere
Produktionsbasis für personenbezogene Daten und Fotos: Schlafphasen,
kurzlebige Datenbanken, fehlende Backups oder sehr kleine Kontingente stehen
dem entgegen. Railway oder Northflank sind für eine bezahlte PaaS-Erprobung
der Anwendung die passendsten, weil mehrere Container/Services vergleichsweise
direkt abbildbar sind.

### 3. Managed-Cloud-Variante: Cloud Run oder Azure Container Apps

Diese Variante lohnt sich, wenn der Kunde bereits GCP bzw. Azure als
Governance- und Betriebsplattform hat. Sie erfordert eine bewusste
Produktionsaufteilung: App-Container, einmaliger Migrations-Job, Managed
PostgreSQL, Managed Redis und Object Storage. Das entfernt Serverpatching,
erhöht jedoch IAM-, Netzwerk- und Kostenmodell-Komplexität. AWS ist in der
gleichen Kategorie, aber für diesen kleinen Stack ohne bestehende AWS-Vorgabe
weniger attraktiv.

## Unabhängige Go-live-Checkliste

Unabhängig vom Hoster müssen vor dem Produktivbetrieb umgesetzt bzw. bestätigt
werden:

1. HTTPS und ein echter Hostname für die App **und** den browsererreichbaren
   Objekt-Endpoint (`OBJECT_STORAGE_PUBLIC_ENDPOINT`); der Bucket bleibt
   privat und wird über zeitlich begrenzte signierte URLs erreicht. Keine
   `localhost`-Werte oder Entwicklungssecrets verwenden.
2. Secrets über Hoster-Secret-Store/geschützte `.env`; insbesondere
   `JWT_SECRET`, initiales Vorgesetzten-Passwort, Datenbank- und
   Object-Store-Zugang. Die Defaults aus `docker-compose.yml` sind nur lokal
   zulässig.
3. `migrate` als kontrollierter One-off-Job vor dem App-Rollout ausführen,
   nicht als dauerhaft laufender Webdienst.
4. Getestete, verschlüsselte Backups für **PostgreSQL und Fotos/MinIO**;
   Wiederherstellung regelmäßig üben. Redis muss nur dann persistent sein,
   wenn später mehr als Rate-Limits darin liegen.
5. Firewall/Netzsegmente: nur Reverse Proxy öffentlich; Postgres, Redis und
   MinIO-Admin-Konsole nicht ins Internet exponieren. Fotozugriff muss zum
   Authentifizierungsmodell passen.
6. Auftragsverarbeitung, Speicherort, Löschfristen und Verantwortlichkeiten
   mit dem Kunden dokumentieren. Die Entscheidung „EU-Region“ allein ersetzt
   diese Prüfung nicht.
