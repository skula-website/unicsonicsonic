# UnicSonic - Komplet Projekt Dokumentation

**Dato:** 23. November 2024  
**Projekt:** Professional Audio Tools for Music Creators  
**Status:** Klar til Render.com deployment  
**Ejer:** Michael Juhl / MIKS SYNDICATE

---

## 📋 Indholdsfortegnelse

1. [Projekt Oversigt](#projekt-oversigt)
2. [Teknisk Arkitektur](#teknisk-arkitektur)
3. [Mappestruktur](#mappestruktur)
4. [Funktioner](#funktioner)
5. [Dependencies](#dependencies)
6. [Deployment til Render.com](#deployment-til-rendercom)
7. [Vigtige Noter](#vigtige-noter)

---

## 🎯 Projekt Oversigt

### Hvad Er UnicSonic?

UnicSonic er en web-baseret audio processing platform med tre hovedværktøjer:

1. **Voice Converter** - Konverter stemmer til andre stemmer med OpenVoice V2
2. **Fingerprint Analyzer** - Detekter AI-genererede audio watermarks
3. **Audio Cleaner** - Fjern AI watermarks/fingerprints fra audio filer

### Formål

Målrettet musikskabere der arbejder med AI-genereret audio og har brug for:
- At fjerne usynlige fingerprints fra AI-platforme (Suno, Udio, etc.)
- At analysere om deres filer indeholder watermarks
- At konvertere stemmer til forskellige karakterer

### Business Model

- **Beta Test:** Gratis adgang med rate limiting
- **Fremtid:** Abonnementsbaseret ($9-29/måned)
- **Target:** Professional musikskabere og producere

---

## 🏗️ Teknisk Arkitektur

### Stack Oversigt

```
┌─────────────────────────────────────────┐
│         Frontend (Next.js 16)            │
│  - React 19.2                            │
│  - TypeScript 5                          │
│  - TailwindCSS 4                         │
└──────────────┬──────────────────────────┘
               │
               │ HTTP Requests
               │
┌──────────────▼──────────────────────────┐
│      API Routes (Next.js /app/api)      │
│  - /api/convert                          │
│  - /api/analyze-fingerprint              │
│  - /api/clean-audio                      │
└──────────────┬──────────────────────────┘
               │
               │ spawn Python scripts
               │
┌──────────────▼──────────────────────────┐
│       Python Backend (scripts/)          │
│  - convert_voice_optimized.py            │
│  - analyze_fingerprint.py                │
│  - remove_audio_fingerprint.py           │
└──────────────┬──────────────────────────┘
               │
               │ Uses ML models
               │
┌──────────────▼──────────────────────────┐
│        OpenVoice V2 Models               │
│  - checkpoints_v2/ (1.4 GB)              │
│  - PyTorch ML models                     │
└──────────────────────────────────────────┘
```

### Hvorfor Python Backend?

**KRITISK:** Python er ikke et valg, men et krav:

1. **OpenVoice V2** eksisterer KUN som Python bibliotek
2. **PyTorch ML models** kræver Python runtime
3. **Audio processing** (STFT, librosa, numpy) er overlegen i Python
4. **JavaScript alternativer** ville tage måneder at udvikle og give dårligere resultater

---

## 📁 Mappestruktur

```
/Volumes/G2025/asyoulike web/tools/
│
├── voice-converter/              # Next.js applikation
│   ├── app/
│   │   ├── api/                 # API routes
│   │   │   ├── convert/         # Voice conversion endpoint
│   │   │   ├── analyze-fingerprint/  # Fingerprint analyse
│   │   │   └── clean-audio/     # Watermark removal
│   │   ├── components/          # React komponenter
│   │   │   ├── VoiceConverter.tsx
│   │   │   ├── FingerprintAnalyzer.tsx
│   │   │   ├── AudioCleaner.tsx
│   │   │   └── WatermarkEnergyComparison.tsx
│   │   ├── page.tsx            # Landing page
│   │   └── landing/page.tsx    # Tools oversigt
│   │
│   ├── scripts/                # Python backend scripts
│   │   ├── convert_voice_optimized.py    # Voice conversion
│   │   ├── analyze_fingerprint.py        # STFT analyse
│   │   └── remove_audio_fingerprint.py   # Watermark removal
│   │
│   ├── public/
│   │   └── unicsonic-logo.png
│   │
│   ├── temp/                   # Temporary audio files
│   ├── output/                 # Converted audio output
│   ├── processed/              # Voice processing cache
│   │
│   ├── package.json            # Node.js dependencies
│   ├── next.config.ts          # Next.js configuration
│   └── tsconfig.json           # TypeScript config
│
└── OpenVoice/                  # Python ML backend
    ├── openvoice/              # Python package
    │   ├── api.py
    │   ├── models.py
    │   └── se_extractor.py
    │
    ├── checkpoints_v2/         # Pre-trained models (1.4 GB)
    │   ├── base_speakers/
    │   └── converter/
    │       ├── checkpoint.pth  # Main ML model
    │       └── config.json
    │
    ├── venv/                   # Python virtual environment
    │
    └── requirements.txt        # Python dependencies
```

---

## ⚙️ Funktioner

### 1. Voice Converter

**Fil:** `app/components/VoiceConverter.tsx`

**Funktionalitet:**
- Upload reference voice (stemme der skal klones)
- Upload original audio (lyd der skal konverteres)
- Konverterer original til reference-stemme med OpenVoice V2

**Python Script:** `scripts/convert_voice_optimized.py`

**API Endpoint:** `/api/convert`

**Process Flow:**
```
1. User uploader 2 audio filer
2. Next.js gemmer filer i /temp
3. API kalder Python script med spawn
4. OpenVoice V2 laver voice conversion
5. Output streames tilbage til browser
```

---

### 2. Fingerprint Analyzer

**Fil:** `app/components/FingerprintAnalyzer.tsx`

**Funktionalitet:**
- Upload audio fil
- STFT analyse af 18-22 kHz frekvensområde
- Detekter AI-watermarks med Python
- Viser spectrogram og energi-metrics

**Python Script:** `scripts/analyze_fingerprint.py`

**API Endpoint:** `/api/analyze-fingerprint`

**Detection Metode:**
```python
# Sammenligner energi i watermark-område (18-22 kHz)
# vs reference-område (14-18 kHz)

watermark_ratio = watermark_energy / reference_energy

if watermark_ratio > 0.35:
    # Detekteret AI watermark
```

**Key Metrics:**
- **Watermark/Reference Ratio** - Clean: ~0.18, Watermark: >0.35
- **Frames with Elevated Energy** - Clean: ~7%, Watermark: >15%

---

### 3. Audio Cleaner

**Fil:** `app/components/AudioCleaner.tsx`

**Funktionalitet:**
- Upload audio fil med watermark
- Fjerner frekvenser over 18 kHz
- Før/efter sammenligning med Python analyse
- Download cleaned audio

**Python Script:** `scripts/remove_audio_fingerprint.py`

**API Endpoint:** `/api/clean-audio`

**Process Flow:**
```
1. User uploader audio
2. Python script laver high-pass filter (removes >18kHz)
3. Cleaned audio streames tilbage
4. WatermarkEnergyComparison viser before/after
```

**Komponenter:**
- `AudioCleaner.tsx` - Main UI og upload
- `WatermarkEnergyComparison.tsx` - Before/after metrics

---

## 📦 Dependencies

### Node.js (package.json)

```json
{
  "dependencies": {
    "next": "16.0.3",
    "react": "19.2.0",
    "react-dom": "19.2.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.0.3",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### Python (requirements.txt)

```txt
librosa==0.9.1           # Audio processing, STFT analyse
faster-whisper==0.9.0    # Speech recognition
pydub==0.25.1            # Audio manipulation
wavmark==0.0.3           # Watermark detection
numpy==1.22.0            # Numerical operations
torch                    # PyTorch for ML models
openvoice                # Voice conversion (fra OpenVoice/)
```

### System Requirements

- **Node.js:** v18+
- **Python:** 3.8 - 3.11 (IKKE 3.12+)
- **ffmpeg:** Required for audio processing
- **Disk Space:** ~2.5 GB (primært OpenVoice models)

---

## 🚀 Deployment til Render.com

### Hvorfor Render.com?

- ✅ Understøtter Python + Node.js samtidig
- ✅ Kan køre Next.js og Python scripts sammen
- ✅ Ingen 250 MB limit som Vercel
- ⚠️ Gratis tier går i dvale efter 15 min (skal betale $7/mnd for always-on)

### Pre-Deployment Checklist

**1. Ryd op i midlertidige filer:**
```bash
cd /Volumes/G2025/asyoulike\ web/tools/voice-converter
rm -rf temp/*
rm -rf output/*
rm -rf processed/*
rm -rf node_modules/.cache
```

**2. Verificer .gitignore:**
Filen skal ignorere:
```
node_modules/
.next/
temp/
output/
processed/
*.wav
*.mp3
*.webm
.env.local
```

**3. Lav render.yaml config:**
```yaml
services:
  - type: web
    name: unicsonic
    env: node
    buildCommand: |
      cd /Volumes/G2025/asyoulike\ web/tools/voice-converter && npm install
      cd /Volumes/G2025/asyoulike\ web/tools/OpenVoice && pip install -r requirements.txt
    startCommand: cd /Volumes/G2025/asyoulike\ web/tools/voice-converter && npm start
    envVars:
      - key: NODE_ENV
        value: production
```

### Deployment Steps

**Se separat sektion nedenfor for detaljeret guide.**

---

## ⚠️ Vigtige Noter

### 1. Python Version Constraint

**KRITISK:** Python 3.12+ virker IKKE!

OpenVoice kræver Python 3.8 - 3.11 pga. dependencies.

**Render.com default:** Python 3.11 ✅

### 2. File Streaming Issues

API routes bruger `ReadableStream` for at streame audio tilbage.

**Kendt problem:** Multiple `controller.close()` calls kan fejle.

**Fix:** `isClosed` flag implementeret i alle API routes.

```typescript
let isClosed = false;
fileStream.on('end', () => {
  if (!isClosed) {
    controller.close();
    isClosed = true;
  }
});
```

### 3. Disk Space Management

Temp filer skal cleanes regelmæssigt:

```bash
# Manuel cleanup
rm -rf temp/* output/* processed/*
```

**TODO:** Implementer automatisk cleanup efter 24 timer.

### 4. Rate Limiting

Implementeret i `middleware.ts`:
- Max 10 requests per 15 min
- Beskytter mod abuse i beta

### 5. basePath Configuration

`next.config.ts` har:
```typescript
basePath: process.env.NODE_ENV === 'production' ? '/tools' : ''
```

**Vigtigt:** Dette var planlagt til at køre på `/tools` subdirectory.

**For Render.com:** Skal fjernes eller ændres til `''` da det kører på egen domain.

**TODO:** Før deployment, fjern basePath eller lav environment variable.

### 6. OpenVoice Models Size

`checkpoints_v2/` er 1.4 GB og skal med i deployment.

**Render.com:** Ingen size limit ✅

**Build time:** Første build tager 5-10 min pga. model download.

### 7. Memory Usage

Audio processing kan bruge meget RAM:
- Voice conversion: ~500 MB
- STFT analyse: ~200 MB

**Render.com free tier:** 512 MB RAM ⚠️

**Anbefaling:** $7/mnd plan med 1 GB RAM for stabil performance.

---

## 🔧 Lokal Udvikling

### Setup

```bash
# Terminal 1: Python environment
cd /Volumes/G2025/asyoulike\ web/tools/OpenVoice
source venv/bin/activate

# Terminal 2: Next.js
cd /Volumes/G2025/asyoulike\ web/tools/voice-converter
npm install
npm run dev
```

**URL:** http://localhost:3000

### Test Python Scripts Manuelt

```bash
cd /Volumes/G2025/asyoulike\ web/tools/OpenVoice
source venv/bin/activate

# Test fingerprint analyse
python ../voice-converter/scripts/analyze_fingerprint.py test.wav output.json

# Test watermark removal
python ../voice-converter/scripts/remove_audio_fingerprint.py input.wav output.wav
```

---

## 📞 Support & Kontakt

**Projekt Ejer:** Michael Juhl  
**Firma:** MIKS SYNDICATE  
**Alle rettigheder:** Ejet af Michael Juhl

## 🔐 Login & Credentials

**Se:** `PROJEKT_CREDENTIALS.md` for:
- Render.com login (Google Account)
- GitHub repository info
- Deployment settings
- Environment variables

**Næste Session:**
- Test alle funktioner live
- Setup custom domain (hvis ønsket)
- Implementer monitoring

---

## 📝 Session Notes

**Status ved denne session:**
- ✅ Alle komponenter virker lokalt
- ✅ Python backend fungerer
- ✅ UI oversat til engelsk
- ✅ Streaming errors fixed
- ✅ Disk space optimeret
- ⏳ Klar til Render.com deployment

**Næste Skridt:**
1. Guide bruger gennem Render.com setup
2. Deploy projektet
3. Test live funktionalitet
4. Dokumenter produktions-URL

---

**Dokument Version:** 1.0  
**Sidst Opdateret:** 23. November 2024, 00:00

