#!/bin/bash

# UnicSonic Cleanup Script
# Fjerner alle midlertidige filer før deployment

echo "🧹 Cleaning up temporary files..."

# Ryd temp mappe
echo "Cleaning temp/..."
rm -rf temp/*
echo "✓ temp/ cleaned"

# Ryd output mappe
echo "Cleaning output/..."
rm -rf output/*
echo "✓ output/ cleaned"

# Ryd processed mappe
echo "Cleaning processed/..."
rm -rf processed/*
echo "✓ processed/ cleaned"

# Ryd saved_voices
echo "Cleaning saved_voices/..."
rm -rf saved_voices/*
echo "✓ saved_voices/ cleaned"

# Ryd test images
echo "Cleaning test images..."
rm -f analysis_*.png
rm -f test_output.png
echo "✓ Test images cleaned"

# Ryd node_modules cache
echo "Cleaning node_modules cache..."
rm -rf node_modules/.cache
echo "✓ node_modules cache cleaned"

# Ryd Next.js cache
echo "Cleaning Next.js cache..."
rm -rf .next/cache
echo "✓ Next.js cache cleaned"

echo ""
echo "✨ Cleanup complete!"
echo ""
echo "Disk space freed:"
du -sh temp/ output/ processed/ saved_voices/ 2>/dev/null || echo "All directories clean"


