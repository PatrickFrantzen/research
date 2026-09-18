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
RUN npm run build

FROM node:22.23-bookworm-slim AS runtime
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --omit=dev --legacy-peer-deps
COPY --from=backend-build /workspace/backend/dist ./dist
COPY --from=frontend-build /workspace/frontend/dist /app/frontend/dist
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main.js"]
