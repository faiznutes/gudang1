FROM node:18-alpine as builder

WORKDIR /app
COPY packages/frontend/package.json .
RUN npm install -g pnpm
COPY packages/frontend .
RUN pnpm install
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80