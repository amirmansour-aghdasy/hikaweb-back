# Multi-stage build for Hikaweb Backend
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Remove .md files and other unnecessary files
RUN find . -name "*.md" -type f -delete && \
    find . -name "*.test.js" -type f -delete && \
    find . -name "*.spec.js" -type f -delete && \
    rm -rf tests/ scripts/test-*.js scripts/debug-*.js

# Production stage
FROM node:18-alpine

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy dependencies and built files from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs --from=builder /app .

# Create logs directory with proper permissions
RUN mkdir -p logs && chmod -R 777 logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "src/server.js"]

