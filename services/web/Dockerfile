FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN rm -f tsconfig.json tsconfig.node.json tsconfig.app.json && \
    echo '{"compilerOptions":{"target":"ES2020","useDefineForClassFields":true,"module":"ESNext","lib":["ES2020","DOM","DOM.Iterable"],"skipLibCheck":true,"moduleResolution":"bundler","allowImportingTsExtensions":true,"resolveJsonModule":true,"isolatedModules":true,"noEmit":true,"jsx":"react-jsx"},"include":["src"]}' > tsconfig.json && \
    echo '{"compilerOptions":{"target":"ES2023","lib":["ES2023"],"module":"ESNext","types":["node"],"skipLibCheck":true,"moduleResolution":"bundler","allowImportingTsExtensions":true,"moduleDetection":"force","noEmit":true,"strict":true},"include":["vite.config.ts"]}' > tsconfig.node.json && \
    echo '{"compilerOptions":{"target":"ES2020","useDefineForClassFields":true,"module":"ESNext","lib":["ES2020","DOM","DOM.Iterable"],"skipLibCheck":true,"moduleResolution":"bundler","allowImportingTsExtensions":true,"isolatedModules":true,"moduleDetection":"force","noEmit":true,"jsx":"react-jsx","strict":true,"noUnusedLocals":true,"noUnusedParameters":true},"include":["src"]}' > tsconfig.app.json
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npx vite build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
