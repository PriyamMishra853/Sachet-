# Sachet API image. Build from the repo root:
#   docker build -f backend/api/Dockerfile -t sachet-api .
FROM node:20-slim
RUN corepack enable
WORKDIR /app

# Install dependencies first (cached unless package files change).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/api/package.json backend/api/
COPY backend/core/package.json backend/core/
COPY backend/db/package.json backend/db/
RUN pnpm install --frozen-lockfile --prod --filter "@sachet/api..."

COPY backend/core backend/core
COPY backend/db backend/db
COPY backend/api backend/api

ENV NODE_ENV=production
# Run as the unprivileged "node" user, not root.
USER node
# pnpm installs tsx in backend/api/node_modules (not the repo root), so the
# server must start from here for `--import tsx` to find it.
WORKDIR /app/backend/api
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--import", "tsx", "src/server.ts"]
