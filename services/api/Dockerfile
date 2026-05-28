FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN rm -f tsconfig*.json && \
    echo '{"compilerOptions":{"module":"commonjs","moduleResolution":"node","esModuleInterop":true,"declaration":true,"removeComments":true,"emitDecoratorMetadata":true,"experimentalDecorators":true,"allowSyntheticDefaultImports":true,"target":"ES2022","lib":["ES2022","DOM"],"sourceMap":true,"outDir":"./dist","baseUrl":"./","incremental":true,"skipLibCheck":true,"strictNullChecks":false},"include":["src/**/*"]}' > tsconfig.json && \
    echo '{"compilerOptions":{"module":"commonjs","moduleResolution":"node","esModuleInterop":true,"declaration":false,"removeComments":true,"emitDecoratorMetadata":true,"experimentalDecorators":true,"allowSyntheticDefaultImports":true,"target":"ES2022","lib":["ES2022","DOM"],"outDir":"./dist","baseUrl":"./","incremental":false,"skipLibCheck":true,"strictNullChecks":false},"include":["src/**/*"],"exclude":["node_modules","dist"]}' > tsconfig.mvp.json
RUN npm install --omit=dev
RUN npx prisma@5.22.0 generate
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/contracts ./contracts
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"
CMD ["node", "dist/main"]
