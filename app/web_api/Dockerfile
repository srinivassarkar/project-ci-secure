# ============================================
# Builder stage - Install dependencies
# ============================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy only package files first (maximize cache usage)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# ============================================
# Production stage - Minimal runtime image
# ============================================
FROM node:18-alpine

# Install only required system tools, then cleanup in same layer
RUN apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Copy node_modules from builder (fewer layers)
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy package files (needed for npm metadata)
COPY --chown=nodejs:nodejs package*.json ./

# Copy source code last (changes most frequently)
COPY --chown=nodejs:nodejs src ./src

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 8080

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "src/server.js"]