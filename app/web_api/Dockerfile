# ============================================
# Builder stage
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app
# Ensure package-lock.json is present for deterministic builds!

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY src ./src

# ============================================
# Production runtime
# ============================================
FROM node:22-alpine

WORKDIR /app

# Install minimal process supervisor
RUN apk add --no-cache dumb-init

# Remove npm (security/hardening)
RUN rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm \
    && rm -f /usr/local/bin/npx \
    && rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy in files (owned by non-root user)
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/src ./src

USER nodejs

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', r => process.exit(r.statusCode===200?0:1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]