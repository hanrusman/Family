# Stage 1: Build web frontend
FROM node:20-alpine AS web-build

WORKDIR /build
COPY web/package*.json ./
RUN npm ci --legacy-peer-deps
COPY web/ ./
RUN npm run build

# Stage 2: Build API with native dependencies
FROM node:20-alpine AS api-build

WORKDIR /app

# Install build tools for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY api/package*.json ./
RUN npm ci --production

# Stage 3: Production image
FROM node:20-alpine

WORKDIR /app

# Copy built node_modules (includes compiled better-sqlite3)
COPY --from=api-build /app/node_modules ./node_modules/
COPY api/package.json ./
COPY api/src/ ./src/
COPY --from=web-build /build/dist ./public/

# Create data directory with correct permissions for non-root user
RUN mkdir -p /app/data && chown -R 1000:1000 /app/data

# Run as non-root user
USER 1000:1000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', r => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1))"

CMD ["node", "src/index.js"]
