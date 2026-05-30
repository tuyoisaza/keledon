# KELEDON Web — static frontend via nginx
# This is the root Dockerfile used by Railway for the keledon-web service.
# (services/web/Dockerfile is the canonical source; this root copy is kept
#  for Railway backward compatibility.)
#
# Build: frontend only (Vite/React), serve via nginx.

FROM node:20-alpine AS builder
WORKDIR /app
COPY services/web/package*.json ./
RUN npm ci
COPY services/web/ .
RUN rm -f tsconfig.json tsconfig.node.json tsconfig.app.json
ARG VITE_API_URL=https://keledonapi.tuyoisaza.com
ENV VITE_API_URL=$VITE_API_URL
RUN npx vite build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY services/web/nginx.conf /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
EXPOSE 8080
