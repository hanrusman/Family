FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY src/ ./src/

# Create session directory with correct permissions for non-root user
RUN mkdir -p /app/session && chown -R 1000:1000 /app/session

# Run as non-root user
USER 1000:1000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD node -e "try { require('fs').accessSync('/app/src/index.js'); process.exit(0); } catch(e) { process.exit(1); }"

CMD ["node", "src/index.js"]
