# 🚀 Deployment Checklist - Railway

**Dato:** 26. November 2025  
**Projekt:** UnicSonic  
**Repository:** https://github.com/skula-website/unicsonicsonic.git

---

## ✅ Pre-Deployment Checks

### 1. Git Repository Configuration
- [x] Git repository initialiseret i root
- [x] Remote tilføjet: `https://github.com/skula-website/unicsonicsonic.git`
- [x] Branch: `main`
- [ ] **MANGER:** Ingen commits endnu - skal committe først

### 2. .gitignore Configuration
- [x] `.gitignore` oprettet i root
- [x] Ignorerer `node_modules/`
- [x] Ignorerer `venv/` og `venv-*/`
- [x] Ignorerer `.next/`, `out/`, `build/`
- [x] Ignorerer `.env*` filer
- [x] Ignorerer audio filer (`*.wav`, `*.mp3`, `*.webm`, `*.m4a`)
- [x] Ignorerer temp/output/processed mapper
- [x] **FIXET:** `PROJEKT_CREDENTIALS.md` tilføjet til .gitignore

### 3. Dockerfile Configuration
- [x] Dockerfile oprettet i root
- [x] Bruger `node:20-slim` base image
- [x] Installerer Python 3, pip, build-essential
- [x] Installerer ffmpeg og libsndfile1
- [x] Kopierer `voice-converter/package*.json`
- [x] Installerer npm dependencies med `npm install`
- [x] Kopierer `voice-converter/requirements-python.txt`
- [x] Installerer Python dependencies
- [x] Kopierer hele `voice-converter/` mappen
- [x] Bygger Next.js app med `npm run build`
- [x] Exposer port 8080
- [x] Starter med `npm start -H 0.0.0.0`

### 4. railway.json Configuration
- [x] `railway.json` oprettet i root
- [x] Builder: `DOCKERFILE`
- [x] Dockerfile path: `Dockerfile`
- [x] Restart policy: `ON_FAILURE` med 10 retries

### 5. package.json
- [x] `voice-converter/package.json` eksisterer
- [x] Next.js 16.0.3
- [x] React 19.2.0
- [x] Build script: `next build`
- [x] Start script: `next start -H 0.0.0.0`
- [x] Alle dependencies defineret

### 6. requirements-python.txt
- [x] `voice-converter/requirements-python.txt` oprettet
- [x] librosa>=0.9.1
- [x] pydub>=0.25.1
- [x] soundfile>=0.12.0
- [x] ffmpeg-python>=0.2.0
- [x] wavmark>=0.0.3
- [x] numpy>=1.22.0
- [x] scipy>=1.9.0
- [x] torch>=2.0.0
- [x] torchaudio>=2.0.0
- [x] matplotlib>=3.5.0
- [x] matplotlib-inline>=0.1.0

### 7. Next.js Configuration
- [x] `next.config.ts` eksisterer
- [x] Body size limit: 100mb
- [x] Image optimization: unoptimized
- [x] Turbopack konfigureret

### 8. Project Structure
- [x] `voice-converter/app/` mappe eksisterer
- [x] `voice-converter/app/layout.tsx` eksisterer
- [x] `voice-converter/app/page.tsx` eksisterer
- [x] `voice-converter/app/api/` routes eksisterer
- [x] `voice-converter/app/components/` eksisterer
- [x] Build test: ✅ **PASSER** (bygger succesfuldt lokalt)

### 9. Python Scripts
- [ ] **KRITISK MANGEL:** `voice-converter/scripts/` mappen er tom
- [ ] **MANGER:** `convert_audio.py` - bruges af `/api/convert-audio`
- [ ] **MANGER:** `analyze_fingerprint.py` - bruges af `/api/analyze-fingerprint`
- [ ] **MANGER:** `remove_audio_fingerprint.py` - bruges af `/api/clean-audio`
- [ ] **MANGER:** `convert_to_mp3.py` - bruges af `/api/analyze-fingerprint`

### 10. Security Check
- [x] Ingen `.env` filer i repository
- [x] Ingen hardcoded secrets i kode
- [ ] **MANGER:** `PROJEKT_CREDENTIALS.md` skal tilføjes til .gitignore
- [x] `node_modules/` ignoreret
- [x] `venv/` ignoreret

### 11. Path Configuration
- [x] `app/lib/paths.ts` eksisterer
- [x] `app/lib/python.ts` eksisterer
- [x] Paths håndterer både local og production
- [x] Python path detection virker

### 12. API Routes
- [x] `/api/convert-audio` - route.ts eksisterer
- [x] `/api/analyze-fingerprint` - route.ts eksisterer
- [x] `/api/clean-audio` - route.ts eksisterer
- [x] `/api/health` - route.ts eksisterer
- [ ] **PROBLEM:** API routes kalder Python scripts der ikke findes

### 13. Environment Variables (Railway)
- [ ] **SKAL SÆTTES:** Ingen environment variables nødvendige (Python bruger system python3)
- [ ] PORT sættes automatisk af Railway
- [ ] NODE_ENV sættes automatisk til production

---

## 🔴 KRITISKE MANGELER DER SKAL UDBEDRES

### 1. Python Scripts Mangler
**Problem:** API routes kalder Python scripts der ikke findes i `voice-converter/scripts/`

**Scripts der mangler:**
- `convert_audio.py` - Audio konvertering (WAV ↔ MP3)
- `analyze_fingerprint.py` - Fingerprint analyse
- `remove_audio_fingerprint.py` - Fingerprint removal
- `convert_to_mp3.py` - MP3 konvertering for optimization

**Løsning:** Enten:
- Opret Python scripts i `voice-converter/scripts/`
- ELLER opdater API routes til at bruge alternative løsninger

### 2. PROJEKT_CREDENTIALS.md i .gitignore
**Problem:** `PROJEKT_CREDENTIALS.md` indeholder login informationer og skal ikke committes

**Løsning:** Tilføj til `.gitignore`:
```
PROJEKT_CREDENTIALS.md
```

---

## 📋 Pre-Push Checklist

Før du pusher til GitHub, skal følgende være færdigt:

- [ ] Alle Python scripts er oprettet eller API routes er opdateret
- [ ] `PROJEKT_CREDENTIALS.md` er tilføjet til .gitignore
- [ ] Build test passer lokalt ✅ (DONE)
- [ ] Alle filer er staged: `git add .`
- [ ] Commit message er klar
- [ ] Ready to push: `git push -u origin main`

---

## 🚀 Post-Deployment Checklist (Railway)

Efter deployment til Railway:

- [ ] Tjek deployment logs for fejl
- [ ] Verificer at build gennemføres
- [ ] Test `/api/health` endpoint
- [ ] Test at Python scripts kan køres
- [ ] Verificer at port binding virker
- [ ] Test en simpel API request
- [ ] Tjek Railway metrics for memory/CPU usage

---

## 📝 Noter

- **Build test:** ✅ PASSER (bygger succesfuldt lokalt)
- **Dockerfile:** ✅ Korrekt konfigureret
- **railway.json:** ✅ Korrekt konfigureret
- **Python dependencies:** ✅ requirements-python.txt oprettet
- **Next.js:** ✅ Build virker

**Hovedproblem:** Python scripts mangler - dette vil forhindre API routes i at virke efter deployment.

