# UnicSonic - Professional Audio Tools

🎵 **Professional Audio Tools for Music Creators**

Bygget af og til **Michael Juhl** (MIKS SYNDICATE)  
_Personlige værktøjer til musikproduktion og udgivelse_

---

## 🚀 Hurtig Start

### Lokal Udvikling

```bash
# Start Next.js
cd voice-converter
npm install
npm run dev
```

Åbn: http://localhost:3000/pipeline

### Python Backend

Python scripts kører automatisk når API routes kaldes.

**Requirements:**
- Python 3.11+
- ffmpeg installeret
- Audio processing libraries: `librosa`, `pydub`, `numpy`, `scipy`, `matplotlib`
- Python venv: `venv-unicsonic` (placeret i `/tools/venv-unicsonic`)

---

## 📦 Hvad Er Dette?

**Audio Processing Pipeline** - Professionel workflow fra rå audio til distribution-klar fil

### **Production-Ready Værktøjer:**

1. **Convert Audio (Process 1)** - Format & kvalitet konvertering
   - Auto-detekter input filtype (WAV, MP3, FLAC, M4A, AAC, OGG, etc.)
   - Output: WAV eller MP3
   - Sample rate conversion: 44.1kHz, 48kHz, 96kHz
   - Bit depth conversion: 16-bit, 24-bit
   - Auto-preset baseret på input format
   
2. **Fingerprint Analyzer (Process 2)** - Detekter AI watermarks
   - STFT-baseret frekvensanalyse
   - Måler energi i 18-22 kHz området
   - Visuel spectrogram
   - Conditional navigation baseret på resultater
   
3. **Audio Cleaner (Process 3)** - Fjern AI fingerprints
   - Lavpas filtering ved 16 kHz
   - Wavmark removal algoritme
   - Before/After energy comparison
   - Bevarer lydkvalitet

### **Pipeline Features:**

- ✅ **Visual Pipeline UI** - Togskinne-forbundet grid med 10 processer
- ✅ **Zoom Animation** - Modals zoomer fra container position
- ✅ **File Transfer** - Automatisk filoverførsel mellem processer
- ✅ **Conditional Navigation** - Smart routing baseret på resultater
- ✅ **Responsive Design** - Mobile, tablet, desktop optimeret
- ✅ **Progress Tracking** - Live timers og progress bars

### **Auxiliary Tools:**

- ✅ **Lyrics Formatter** - Apple Music og Spotify formatting
  - Auto-removal af non-lyrical content
  - localStorage persistence

### **Fremtidige Processer (Ikke implementeret):**

- 🔲 Key Detect (Process 4)
- 🔲 Tabs Detector (Process 5)
- 🔲 Noise Remover (Process 6)
- 🔲 Genre Detector (Process 7)
- 🔲 Audio Trimmer (Process 8)
- 🔲 Fade In/Out (Process 9)
- 🔲 Auto EQ & Normalization (Process 10)

---

## 🏗️ Teknisk Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **Backend:** Python 3.11
- **Audio Processing:** 
  - `librosa` - Audio loading og STFT analyse
  - `pydub` - Audio format conversion (WAV, MP3, FLAC, etc.)
  - `numpy`, `scipy` - Signal processing
  - `matplotlib` - Spectrogram visualisering
- **Styling:** TailwindCSS 4
- **UI Framework:** React 19, Next.js 16 (App Router)

---

## 📄 Dokumentation

**Komplet dokumentation:** Se `UNICSONIC_KOMPLET_DOKUMENTATION.md`

Denne fil indeholder:
- Fuld teknisk arkitektur
- Mappestruktur og kode-oversigt
- Deployment guide til Render.com
- Vigtige noter og troubleshooting

**Login & Credentials:** Se `PROJEKT_CREDENTIALS.md`
- Render.com login info (Google Account)
- GitHub repository detaljer
- Deployment settings

---

## ⚠️ Vigtige Noter

### Python Krav

Python 3.11+ anbefales (OpenVoice kræver 3.8-3.11, men bruges ikke aktivt).

### Disk Space

- **Core værktøjer** (Analyzer + Cleaner): ~500 MB
- **Med OpenVoice** (eksperimentelt): ~2.5 GB (ML models = 1.4 GB)

**Note:** OpenVoice er installeret som dependency men ikke i primært fokus.

### Hosting

Projektet kræver Python backend og kan derfor IKKE hostes på:
- ❌ Vercel (kun Node.js serverless)
- ❌ Static hosting (FTP)

✅ **Anbefalet:** Render.com ($7/måned for always-on)

---

## 🔧 Deployment

Se `UNICSONIC_KOMPLET_DOKUMENTATION.md` for detaljeret guide til Render.com deployment.

**TL;DR:**
1. Push til Git repository
2. Connect til Render.com
3. Deploy som Web Service med Python + Node.js
4. Profit 🎉

---

## 📞 Support

**Ejer:** Michael Juhl  
**MIKS SYNDICATE**

Alle rettigheder tilhører Michael Juhl.

---

**Version:** 1.0  
**Status:** Klar til deployment

