# ── build ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo

# Solo manifiestos primero: cachea la instalación
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/config/package.json packages/config/
COPY packages/contracts/package.json packages/contracts/
COPY packages/domain/package.json packages/domain/
COPY packages/database/package.json packages/database/
COPY packages/ui/package.json packages/ui/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @ligas/api...

COPY packages packages
COPY apps/api apps/api
RUN pnpm --filter @ligas/database generate \
 && pnpm --filter @ligas/api build

# ── runtime ──────────────────────────────────────────────────────────────
FROM node:22-alpine
RUN corepack enable && addgroup -S app && adduser -S app -G app
WORKDIR /repo
ENV NODE_ENV=production

COPY --from=build /repo/pnpm-workspace.yaml /repo/package.json /repo/pnpm-lock.yaml ./
COPY --from=build /repo/packages/database/package.json packages/database/
COPY --from=build /repo/packages/database/prisma packages/database/prisma
COPY --from=build /repo/apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --prod --filter @ligas/api... \
 && cd packages/database && npx prisma generate && cd ../..

COPY --from=build /repo/apps/api/dist apps/api/dist

USER app
EXPOSE 4000
# Aplica migraciones pendientes y arranca
CMD ["sh", "-c", "cd packages/database && npx prisma migrate deploy && cd ../.. && node apps/api/dist/main.js"]
