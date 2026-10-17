# Multi-stage Dockerfile for 24/7 Yerima Naira Bot & Server
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm install -g tsx && npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/bot.ts ./bot.ts

EXPOSE 3000

# Runs the server & background Telegram bot engine 24/7
CMD ["tsx", "server.ts"]
