# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22.12.0
ARG PNPM_VERSION=10.15.0

FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION

ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    CI=true

RUN apk add --no-cache libc6-compat openssl \
  && npm install -g "pnpm@${PNPM_VERSION}" \
  && pnpm config set store-dir /pnpm/store

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build

ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/automation_service
ENV DATABASE_URL="${DATABASE_URL}" \
    NODE_ENV=production

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY nest-cli.json tsconfig*.json ./
COPY src ./src

RUN pnpm prisma generate
RUN pnpm build
RUN pnpm prune --prod

FROM node:${NODE_VERSION}-alpine AS runtime
ARG PNPM_VERSION

ENV NODE_ENV=production \
    PORT=5000 \
    PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH"

RUN apk add --no-cache bash curl netcat-openbsd openssl postgresql-client redis tini \
  && npm install -g "pnpm@${PNPM_VERSION}" \
  && pnpm config set store-dir /pnpm/store \
  && addgroup -S nodeapp \
  && adduser -S nodeapp -G nodeapp -h /app

WORKDIR /app

COPY --from=build --chown=nodeapp:nodeapp /app/package.json ./package.json
COPY --from=build --chown=nodeapp:nodeapp /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build --chown=nodeapp:nodeapp /app/node_modules ./node_modules
COPY --from=build --chown=nodeapp:nodeapp /app/dist ./dist
COPY --from=build --chown=nodeapp:nodeapp /app/prisma ./prisma
COPY --from=build --chown=nodeapp:nodeapp /app/prisma.config.ts ./prisma.config.ts

COPY --chown=nodeapp:nodeapp infra/docker/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY --chown=nodeapp:nodeapp infra/docker/healthcheck.sh /usr/local/bin/healthcheck.sh
COPY --chown=nodeapp:nodeapp infra/scripts/wait-db.sh /usr/local/bin/wait-db.sh

RUN chmod 0755 /usr/local/bin/entrypoint.sh /usr/local/bin/healthcheck.sh /usr/local/bin/wait-db.sh \
  && chown -R nodeapp:nodeapp /app \
  && chmod -R go-w /app

USER nodeapp

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD /usr/local/bin/healthcheck.sh

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["node", "dist/src/main.js"]
