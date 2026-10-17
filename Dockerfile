# Multi-stage Dockerfile for 24/7 Yerima Naira Bot & Server
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
# Use npm ci if package-lock.json is present, fallback to npm install
RUN if [ -f package-lock.json ]; then npm ci || npm install; else npm install; fi

COPY . .
RUN npm run build

# Production runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev || npm install --omit=dev; else npm install --omit=dev; fi

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/bot.ts ./bot.ts

EXPOSE 3000

# Runs the full-stack server & background Telegram bot engine 24/7
CMD ["npm", "start"]
