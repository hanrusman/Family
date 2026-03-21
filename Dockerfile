FROM node:20-alpine AS web-build

WORKDIR /build
COPY web/package*.json ./
RUN npm ci --legacy-peer-deps
COPY web/ ./
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY api/package*.json ./
RUN npm ci --production

COPY api/src/ ./src/
COPY --from=web-build /build/dist ./public/

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "src/index.js"]
