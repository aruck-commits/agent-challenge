FROM node:20-slim AS base
WORKDIR /app
RUN npm install -g npm@11.11.0
COPY package*.json ./

FROM base AS deps
RUN npm ci --include=dev

FROM deps AS build
COPY . .
RUN npm run build

FROM node:20-slim AS production
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install -g npm@11.11.0 \
  && npm ci --omit=dev

COPY --from=build /app/src/ui/.next/standalone ./
COPY --from=build /app/src/ui/.next/static ./src/ui/.next/static
COPY --from=build /app/src/ui/public ./src/ui/public

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["node", "src/ui/server.js"]
