# ============================================
# Builder stage
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy only dependency manifests to leverage caching
COPY package*.json ./

# Install dependencies with a clean reproducible env
RUN npm ci && npm cache clean --force

# Copy application code
COPY src ./src

# ============================================
# Production runtime
# ============================================
FROM node:22-alpine

WORKDIR /app

# Install minimal process supervisor
RUN apk add --no-cache dumb-init

# ---- SECURITY & SIZE OPTIMIZATION ----
# 1. Remove npm completely (removes vulnerable glob dependency)
# 2. Delete caches + temp data
RUN rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm \
    && rm -f /usr/local/bin/npx \
    && rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Bring production node_modules
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy package metadata
COPY --chown=nodejs:nodejs package*.json ./

# Copy source code
COPY --from=builder --chown=nodejs:nodejs /app/src ./src

USER nodejs

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', r => process.exit(r.statusCode===200?0:1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
