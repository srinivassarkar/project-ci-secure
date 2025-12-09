# app/service/Dockerfile
# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Final stage - tiny, non-root, secure
FROM node:22-alpine AS final
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 nodejs

# Copy only necessary files
COPY --from=builder /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./

# Security best practices
USER nodejs
EXPOSE 8080
ENV NODE_ENV=production

# Health checks
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["node", "src/server.js"]