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

# Copy package files from voice-converter FIRST
COPY voice-converter/package.json ./
COPY voice-converter/package-lock.json* ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install

# Install Python dependencies (if requirements-python.txt exists)
COPY voice-converter/requirements-python.txt* ./
RUN if [ -f requirements-python.txt ]; then pip3 install --no-cache-dir -r requirements-python.txt --break-system-packages; fi

# Copy application code from voice-converter (this will overwrite package.json, but that's OK)
COPY voice-converter/ .

# Build Next.js app
RUN npm run build

# Expose port (Railway will set PORT env variable dynamically)
EXPOSE 8080

# Start the app (Next.js reads PORT from environment automatically)
CMD ["npm", "start"]

