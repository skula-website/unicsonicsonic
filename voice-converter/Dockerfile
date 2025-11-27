# Use official Node.js 20 LTS
FROM node:20-slim

# Install Python and dependencies (including ffmpeg for MP3 conversion)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Install Python dependencies
COPY requirements-python.txt ./
RUN pip3 install --no-cache-dir -r requirements-python.txt --break-system-packages

# Copy application code
COPY . .

# Build Next.js app
RUN npm run build

# Expose port (Railway will set PORT env variable dynamically)
EXPOSE 8080

# Start the app (Next.js reads PORT from environment automatically)
CMD ["npm", "start"]

