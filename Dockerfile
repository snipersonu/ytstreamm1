# Multi-stage build for YouTube Livestream System

# Stage 1: Builder - Install all dependencies and build the frontend
FROM node:18-bullseye AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for building)
RUN npm ci

# Copy application source code
COPY . .

# Build the React frontend
RUN npm run build

# Stage 2: Production - Create the final optimized image
FROM node:18-bullseye

# Set working directory
WORKDIR /app

# Install system dependencies including FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy server code from builder stage
COPY --from=builder /app/server ./server

# Create necessary directories
RUN mkdir -p server/logs server/uploads

# Expose the port the app runs on
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Start the application
CMD ["npm", "run", "start:server"]