FROM node:18-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json pnpm-lock.yaml ./
COPY packages/frontend/package.json ./packages/frontend/

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build frontend
RUN pnpm build --filter @stockpilot/frontend

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

# Nginx config for SPA
RUN echo 'server { listen 80; root /usr/share/nginx/html; index index.html; try_files $uri $uri/ /index.html; location / { add_header Cache-Control "no-cache"; } }' > /etc/nginx/http.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]