# 🚀 Deployment Guide - UnicSonic til Railway

**Dato:** 27. November 2025  
**Status:** ✅ ALT FORBEREDT - Klar til deployment

---

## ✅ Pre-Deployment Checklist

### Backup Status
- ✅ Backup lavet af fungerende lokal kode
- ✅ Dokumenteret i `DEPLOYMENT_BACKUP_NOTES.md`

### Konfigurationer Verificeret
- ✅ `Dockerfile` - Korrekt konfigureret i root
- ✅ `railway.json` - Korrekt konfigureret i root
- ✅ `.gitignore` - Alle unødvendige filer ignoreres
- ✅ Python scripts - Alle til stede i `voice-converter/scripts/`
- ✅ Reference spektrogram - `voice-converter/public/reference-spectrogram.png`

### Railway Projekt
- **Projekt:** `unicsonicsonic`
- **Projektnavn:** `gentle-expression`
- **GitHub Repo:** `skula-website/unicsonicsonic`

---

## 📋 Deployment Steps

### Step 1: Git Staging og Commit

**Kommandoer (kør i `/Volumes/G2025/asyoulike web/tools`):**

```bash
# 1. Tjek status
git status

# 2. Stage alle filer (inkl. voice-converter mappen)
git add .

# 3. Verificer hvad der er staged
git status

# 4. Commit med beskrivende besked
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

# 5. Push til GitHub
git push origin main
```

### Step 2: Verificer GitHub Push

**Efter push, verificer:**
1. Gå til: https://github.com/skula-website/unicsonicsonic
2. Tjek at alle filer er committet
3. Tjek at `voice-converter/` mappen er inkluderet
4. Tjek at `Dockerfile` og `railway.json` er i root

### Step 3: Railway Deployment

**Railway vil automatisk:**
1. Detektere push til `main` branch
2. Starte build process (bruger Dockerfile)
3. Installere dependencies (Node.js og Python)
4. Bygge Next.js app
5. Deploye til production

**Manuelle handlinger (hvis nødvendigt):**
1. **Hvis Railway ikke starter automatisk:**
   - Gå til Railway dashboard
   - Klik på projektet `gentle-expression`
   - Klik "Deploy" eller "Redeploy"

2. **Hvis build fejler:**
   - Tjek Railway logs
   - Verificer at Dockerfile paths er korrekte
   - Verificer at alle dependencies er i `requirements-python.txt`

3. **Hvis deployment fejler:**
   - Tjek Railway logs for fejl
   - Verificer at port er korrekt (Railway sætter PORT automatisk)
   - Verificer at `npm start` kører korrekt

### Step 4: Verificer Deployment

**Efter deployment, test:**
1. Åbn Railway dashboard
2. Find deployment URL (fx `unicsonicsonic-production.up.railway.app`)
3. Test at appen loader
4. Test Process 1 (Convert Audio)
5. Test Process 2 (Analyze Audio)
6. Test Process 3 (Remove Fingerprint)

---

## 🔍 Verificering af Konfiguration

### Dockerfile Verificering
```bash
# Tjek at Dockerfile er korrekt
cat Dockerfile

# Vigtige punkter:
# - Kopierer voice-converter/package*.json først
# - Installerer npm dependencies
# - Kopierer voice-converter/requirements-python.txt
# - Installerer Python dependencies
# - Kopierer hele voice-converter/ mappen
# - Bygger Next.js app
# - Starter med npm start
```

### railway.json Verificering
```bash
# Tjek at railway.json er korrekt
cat railway.json

# Vigtige punkter:
# - builder: "DOCKERFILE"
# - dockerfilePath: "Dockerfile"
# - restartPolicyType: "ON_FAILURE"
```

### .gitignore Verificering
```bash
# Tjek at .gitignore ignorerer korrekte filer
cat .gitignore

# Vigtige punkter:
# - node_modules/ ignoreres
# - .next/ ignoreres
# - venv/ ignoreres
# - Audio filer ignoreres
# - Temp/output/processed mapper ignoreres
```

---

## 🐛 Troubleshooting

### Problem: Build fejler på Railway
**Løsning:**
1. Tjek Railway logs for specifik fejl
2. Verificer at alle Python dependencies er i `requirements-python.txt`
3. Verificer at Dockerfile paths er korrekte
4. Tjek at `voice-converter/package.json` eksisterer

### Problem: App starter ikke
**Løsning:**
1. Tjek Railway logs for start fejl
2. Verificer at `npm start` kører korrekt
3. Tjek at PORT environment variable er sat (Railway gør dette automatisk)
4. Verificer at Next.js build var succesfuld

### Problem: Python scripts virker ikke
**Løsning:**
1. Tjek at Python dependencies er installeret
2. Verificer at scripts har execute permissions
3. Tjek Railway logs for Python fejl
4. Verificer at Python path detection virker

---

## 📝 Noter

- **Backup:** Backup er lavet og dokumenteret
- **Rollback:** Hvis deployment fejler, brug backup til at gendanne
- **Monitoring:** Monitor Railway logs efter deployment
- **Testing:** Test alle 3 processer efter deployment

---

## ✅ Deployment Complete

Når deployment er succesfuld:
1. ✅ App kører på Railway
2. ✅ Alle 3 processer virker
3. ✅ Spectrogram visualization virker
4. ✅ Risk categorization virker
5. ✅ File transfer mellem processer virker

**Næste skridt:** Test appen på Railway URL og verificer alle features.

