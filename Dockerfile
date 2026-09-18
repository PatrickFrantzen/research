# Baut den Angular-PWA-Build und das NestJS-Backend, liefert beide same-origin
# aus einem Runtime-Image aus (siehe docs/research/02-architektur.md Abschnitt 1).
#
# Die Runtime hält backend/ und frontend/ als Geschwisterordner unter /app,
# damit die relative Pfadauflösung in src/app.module.ts unverändert bleibt
# (identisch zum lokalen Dev-Layout).

FROM node:22.23-bookworm-slim AS frontend-build
WORKDIR /workspace/frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

FROM node:22.23-bookworm-slim AS backend-build
WORKDIR /workspace/backend
COPY backend/package*.json ./
RUN npm install --legacy-peer-deps
COPY backend/ ./
# Generiert src/generated/prisma/*.ts aus prisma/schema.prisma, bevor `nest
# build` (tsc) den gesamten src/-Baum kompiliert.
RUN npx prisma generate
RUN npm run build

FROM node:22.23-bookworm-slim AS runtime
WORKDIR /app/backend
COPY backend/package*.json ./
# --ignore-scripts: Prisma-Postinstall braucht ein bereits vorhandenes Schema,
# das an dieser Stelle noch nicht kopiert ist. Der Client kommt unten fertig
# generiert/kompiliert aus backend-build, muss hier nicht neu erzeugt werden.
RUN npm install --omit=dev --ignore-scripts --legacy-peer-deps
COPY --from=backend-build /workspace/backend/dist ./dist
# Für `prisma migrate deploy` (Schema/Migrationen) und die per tsx
# ausgeführten Seed-Skripte (prisma/seed-*.ts, inkl. deren TS-Import des
# generierten Prisma-Clients).
COPY --from=backend-build /workspace/backend/prisma ./prisma
COPY --from=backend-build /workspace/backend/prisma.config.ts ./prisma.config.ts
COPY --from=backend-build /workspace/backend/src/generated ./src/generated
COPY --from=frontend-build /workspace/frontend/dist /app/frontend/dist
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main.js"]
