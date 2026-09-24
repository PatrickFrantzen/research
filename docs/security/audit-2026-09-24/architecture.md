# Architecture summary — PatrickFrantzen/research (run-1)

## 1. Product, principals, protected resources
Internal company PWA "re:search" for recording waste entries (Wareneinträge: AVV code, free text, up to 3 photos, Standort snapshot). Principals: **anonymous internet** (login, logout, passwort-vergessen, passwort-setzen, public health, static SPA, presigned photo URLs on FILES_DOMAIN); **Nutzer** (single role, no RBAC; by design may create entries, read ALL entries, edit/delete only own entries, create other Nutzer accounts, edit own name/Standort — CONTEXT.md:36-41); **operator** (docker compose on VPS behind Caddy, seeds first Nutzer from INITIAL_NUTZER_*). Protected resources: Nutzer accounts/credentials, entries owned by other Nutzer, photos in MinIO, JWT secret, DB/MinIO/Redis.

## 2. Comparable baseline
Predecessor `waste-connect-v2` (NestJS/Angular/MongoDB/JWT) is cited but not present locally; standard NestJS + passport-jwt + helmet patterns are the calibration baseline.

## 3. Stack and deployment
TypeScript. Backend NestJS 12 / Express, Prisma 7 on PostgreSQL 16, passport-jwt (HS256, iss/aud pinned), bcrypt, helmet CSP, class-validator (whitelist+forbidNonWhitelisted), multer memoryStorage, AWS SDK S3 → MinIO, Throttler with Redis storage. Frontend Angular 22 + Material + service worker (static asset cache only). One image; backend serves SPA same-origin. Dev compose: NODE_ENV=development, default secrets, app:3000 and minio:9000 published. Prod compose: only Caddy 80/443, secrets from server .env, `{$FILES_DOMAIN}` reverse-proxies the entire MinIO S3 API. **Execution limit:** no node_modules, installs prohibited, no DB/Redis/MinIO, no browser → no target-controlled execution this run; all checks are source-only.

## 4. Entry surfaces and key paths
- `backend/src/auth/auth.controller.ts` login/logout/passwort-vergessen/passwort-setzen (public, 5/min) → auth.service.ts → Prisma Nutzer, token hash (passwort-setzen-token.ts), ConsoleMailer (logs only).
- JWT cookie `accessToken` → jwt.strategy.ts (DB user lookup, iat vs passwortGeaendertAm) → jwt-auth.guard.ts + csrf.ts (double submit for non-GET).
- `nutzer.controller.ts` POST /nutzer (any Nutzer creates accounts, returns raw 7-day setup link), GET/PATCH /nutzer/me (self-assigned standortId).
- `wareneintrag.controller.ts` GET (filters, raw SQL full-text search in wareneintrag.service.ts:91-120, presigned URLs), POST/PATCH multipart photos (magic-byte validation, 10 MB each), DELETE; ownership via `pruefeBesitz` (service :186-192).
- `avv.controller.ts` search, `standort.controller.ts` list, `health.controller.ts` (public liveness, JWT details).
- `object-storage.service.ts` random UUID keys, 15-min presigned GET signed for public endpoint.
- Frontend: routes/guards (client-only), csrf/unauthorized interceptors, passwort-setzen reads `?token`, ngsw-config.json.
- Deploy: Caddyfile, docker-compose*.yml (minio-init policy), Dockerfile (`npm install`), .github/workflows/ci.yml.

## 5. Trust boundaries and strongest source-visible control
- Anonymous → session: bcrypt login + 5/min throttle (keyed on req.ip; no `trust proxy` → behind Caddy likely shared bucket, deployment fact).
- Session integrity: HS256 JWT in HttpOnly SameSite=Strict cookie, iss/aud, DB user existence, iat vs password-change (skipped when iat absent); default JWT secrets rejected only in production.
- Cross-site: SameSite=Strict + double-submit CSRF in guard; public POSTs rely on SameSite/JSON.
- Recovery: 32-byte random token, SHA-256 stored, 1h/7d expiry, single use (non-atomic find-then-update).
- Nutzer → other Nutzer's entries: `pruefeBesitz` on PATCH/DELETE.
- Nutzer → account provisioning: none beyond authentication (design decision, CONTEXT.md).
- Internet → MinIO: MinIO auth/presign only; app key policy Get/Put/Delete/List on bucket.
- Browser rendering: Angular interpolation, no innerHTML/bypassSecurityTrust; CSP.

## 6. Starting paths
backend/src/{auth,nutzer,wareneintrag,object-storage,avv,standort,health,config,main.ts,app.module.ts,security-headers.ts}, backend/prisma, frontend/src/app/{core,features}, frontend/ngsw-config.json, Caddyfile, docker-compose*.yml, Dockerfile, .github/workflows/ci.yml, .gitignore.

## 7. Prior coverage
No prior ledger or findings exist for this repo. This is the first run. `.claude/` (vendored agent skills) is out of scope.

## 8. Companion selection
Selected: WEB-PROTOCOL-AND-AUTH.md (cookie JWT sessions, CSRF, password recovery, forwarded-header trust behind Caddy); CLIENT-SIDE.md (Angular SPA, service worker, URL-token handling); DATA-ISOLATION-AND-LIFECYCLE.md (per-owner entries, blob/presigned references, deletion of photos); CLOUD-AND-DEPLOYMENT.md (compose, Caddy ingress, MinIO policy, env-based security precedence); SUPPLY-CHAIN-AND-RELEASE.md (CI workflow, Dockerfile dependency install); RESOURCE-EXHAUSTION-AND-AVAILABILITY.md (in-memory multipart buffering, unbounded query/text inputs, shared throttle bucket). Excluded: MEMORY-SAFETY-AND-BINARY.md (no native code), AI-AND-LLM.md (no model integration), PROTOCOLS-RPC-AND-MESSAGING.md (no RPC/queues/webhooks), DESKTOP-MOBILE-AND-LOCAL-IPC.md (PWA only, no native/IPC).
