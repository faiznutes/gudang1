FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
RUN pnpm install -r --frozen-lockfile
COPY packages/shared packages/shared
COPY packages/backend packages/backend
RUN cd packages/backend && DATABASE_URL="postgresql://stockpilot:stockpilot@postgres:5432/stockpilot?schema=public" pnpm build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY --from=builder /app /app
ENV NODE_ENV=production
EXPOSE 4000
CMD ["sh", "-c", "cd packages/backend && pnpm prisma migrate deploy && pnpm db:seed && pnpm start"]
