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

EXPOSE 3000

CMD ["node", "src/index.js"]
