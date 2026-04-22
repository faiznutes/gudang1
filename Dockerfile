FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY packages/frontend/package.json ./packages/frontend/

RUN corepack enable && corepack prepare pnpm@latest --activate

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build --filter @stockpilot/frontend

FROM nginx:alpine

COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

RUN echo 'server { listen 80; root /usr/share/nginx/html; index index.html; try_files $uri $uri/ /index.html; location / { add_header Cache-Control "no-cache"; } }' > /etc/nginx/http.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]