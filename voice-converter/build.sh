#!/bin/bash
set -e

echo "📦 Installing Node.js dependencies..."
npm install

echo "🔨 Building Next.js..."
npm run build

echo "🐍 Installing Python dependencies..."
pip3 install --upgrade pip
pip3 install -r requirements-python.txt

echo "✅ Build complete!"
