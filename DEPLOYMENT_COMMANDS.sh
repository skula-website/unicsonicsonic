#!/bin/bash
# Deployment Commands - UnicSonic til Railway
# Dato: 27. November 2025
# 
# Kør disse kommandoer i rækkefølge for at deploye til Railway

set -e  # Stop ved fejl

echo "🚀 Starting UnicSonic Deployment to Railway"
echo ""

# Step 1: Verificer vi er i rigtig mappe
if [ ! -f "Dockerfile" ] || [ ! -f "railway.json" ]; then
    echo "❌ Error: Dockerfile eller railway.json ikke fundet"
    echo "   Kør dette script fra: /Volumes/G2025/asyoulike web/tools"
    exit 1
fi

echo "✅ Verificeret: Vi er i rigtig mappe"
echo ""

# Step 2: Tjek Git status
echo "📋 Step 1: Tjekker Git status..."
git status --short
echo ""

# Step 3: Stage alle filer
echo "📦 Step 2: Staging alle filer..."
git add .
echo "✅ Alle filer staged"
echo ""

# Step 4: Verificer staged filer
echo "📋 Step 3: Verificerer staged filer..."
git status --short | head -20
echo ""

# Step 5: Commit
echo "💾 Step 4: Committer ændringer..."
git commit -m "feat: Complete UnicSonic pipeline with watermark detection and removal

- Add Process 1: Convert Audio (format & quality conversion)
- Add Process 2: Analyze Audio (STFT-based watermark detection)
- Add Process 3: Remove Fingerprint (low-pass filter at 16kHz)
- Add Pipeline UI with zoom animations and file transfer
- Add WatermarkEnergyComparison with risk categories and visual markers
- Add spectrogram visualization with reference comparison
- Optimize spectrogram generation (reduced resolution for faster processing)
- Add risk-based categorization (Success/Acceptable/OK/Not Satisfactory)
- Add visual markers at 10%, 20%, 40% thresholds
- Generate reference spectrogram for comparison
- Update AnalyzerContent with side-by-side spectrogram display
- Configure Dockerfile for Railway deployment
- Configure railway.json for Dockerfile builder
- All Python scripts implemented and tested
- Ready for Railway deployment"

echo "✅ Commit succesfuld"
echo ""

# Step 6: Push til GitHub
echo "📤 Step 5: Pushing til GitHub..."
git push origin main

echo ""
echo "✅ Push succesfuld!"
echo ""
echo "🎉 Deployment til GitHub er færdig!"
echo ""
echo "📋 Næste skridt:"
echo "   1. Verificer push på GitHub: https://github.com/skula-website/unicsonicsonic"
echo "   2. Railway vil automatisk starte deployment"
echo "   3. Tjek Railway dashboard for deployment status"
echo "   4. Test appen på Railway URL når deployment er færdig"
echo ""

