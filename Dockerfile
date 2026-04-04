# BUILDER STAGE
FROM node:20-alpine AS builder
WORKDIR /app

# Enable corepack for modern package managers (optional safety)
RUN corepack enable

# 1. Build Frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# We enabled output: 'standalone' in next.config.mjs
RUN npm run build

# 2. Build Backend (Just install deps)
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./

# RUNNER STAGE
FROM node:20-alpine AS runner
WORKDIR /app

# Install concurrently to run both Express and Next.js seamlessly
RUN npm install -g concurrently

# Set production environment
ENV NODE_ENV=production
# Next.js port
ENV PORT=3000
# Ensure Next.js correctly proxies to the internal backend
ENV NEXT_INTERNAL_API_URL="http://127.0.0.1:5000/api"

# Copy Backend
COPY --from=builder /app/backend ./backend

# Copy Next.js Standalone files
# Standalone moves node_modules and server.js into the standalone folder
COPY --from=builder /app/frontend/.next/standalone ./frontend
COPY --from=builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder /app/frontend/public ./frontend/public

# Expose ports
EXPOSE 3000
EXPOSE 5000

# Start both servers in parallel
# The frontend automatically proxies /api to port 5000
CMD ["concurrently", "\"cd backend && npm start\"", "\"cd frontend && node server.js\""]
