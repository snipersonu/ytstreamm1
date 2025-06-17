# Use Node.js 18 LTS as base image
FROM node:18-bullseye

# Set working directory
WORKDIR /app

# Install system dependencies including FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application source code
COPY . .

# Create necessary directories
RUN mkdir -p server/logs server/uploads

# Build the React frontend
RUN npm run build

# Expose the port the app runs on
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Start the application
CMD ["npm", "run", "start:server"]