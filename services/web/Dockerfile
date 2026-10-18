# KELEDON Web Service — Vite/React static site.
# Railway must use the repository root as the build context because this app
# consumes the canonical shared/theme-tokens.css from the monorepo root.

FROM node:20-alpine AS builder
WORKDIR /app
COPY services/web/package*.json ./
RUN npm ci
COPY services/web/ ./
COPY shared/ /shared/
RUN rm -f tsconfig.json tsconfig.node.json tsconfig.app.json
ARG VITE_API_URL=
ENV VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npx vite build

FROM nginx:alpine
RUN apk add --no-cache ca-certificates
COPY --from=builder /app/dist /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY services/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 services/web/verify-nginx.sh /docker-entrypoint.d/40-verify-nginx.sh
CMD ["nginx", "-g", "daemon off;"]
EXPOSE 8080
