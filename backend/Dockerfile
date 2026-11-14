# syntax=docker/dockerfile:1
FROM node:20 AS build
WORKDIR /app
COPY backend ./backend
COPY shared ./shared
WORKDIR /app/backend
RUN npm ci && npm run build

FROM node:20-alpine AS deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app/backend
COPY --from=build /app/backend/dist ./dist
COPY --from=deps /app/backend/node_modules ./node_modules
COPY backend/docker-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "dist/backend/src/index.js"]
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:4000/api/health || exit 1