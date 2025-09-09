# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Set environment variables for build
ENV NEXT_PUBLIC_API_URL=https://analyticsdepot.com/api
ENV NEXT_PUBLIC_ENVIRONMENT=production

# Install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build application with production optimizations
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_PUBLIC_API_URL=https://analyticsdepot.com/api

# Copy necessary files - if not using standalone output
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create non-root user for better security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app
USER nextjs

# Expose the port the app runs on
EXPOSE 3000

# Health check to verify the service is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health-check || exit 1

# Start the application
CMD ["npm", "start"]