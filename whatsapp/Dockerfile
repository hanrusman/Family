FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY src/ ./src/

# Create session directory with correct permissions for non-root user
RUN mkdir -p /app/session && chown -R 1000:1000 /app/session

CMD ["node", "src/index.js"]
