# KELEDON Web Service — Vite/React static site
#
# Source code comes from git clone (avoids WSL COPY null byte corruption).
# The source stage clones the repo; later stages COPY --from=source.
# Only small config files (nginx.conf) come from build context.

FROM node:20-alpine AS source
WORKDIR /tmp/repo
RUN apk add --no-cache git
RUN git clone --depth 1 https://github.com/tuyoisaza/KELEDON.git /tmp/repo

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=source /tmp/repo/services/web/package*.json ./
RUN npm ci
COPY --from=source /tmp/repo/services/web . .
RUN rm -f tsconfig.json tsconfig.node.json tsconfig.app.json
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npx vite build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
