# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for layer caching
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built artifacts from the builder stage
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 3636

CMD ["node", "dist/main.js"]
