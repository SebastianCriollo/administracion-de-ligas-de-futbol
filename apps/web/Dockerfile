# ── build ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/config/package.json packages/config/
COPY packages/contracts/package.json packages/contracts/
COPY packages/domain/package.json packages/domain/
COPY packages/ui/package.json packages/ui/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @ligas/web...

COPY packages packages
COPY apps/web apps/web
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @ligas/web build

# ── runtime (standalone de Next) ─────────────────────────────────────────
FROM node:22-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0

COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static apps/web/.next/static
COPY --from=build /repo/apps/web/public apps/web/public

USER app
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
