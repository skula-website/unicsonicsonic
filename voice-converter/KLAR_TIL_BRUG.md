# Voice Converter PRO - Klar til Brug! ✅

## Hvad er installeret

✅ Next.js frontend med drag-and-drop interface  
✅ Indbygget voice recorder med guidet tekst  
✅ Voice library - gem og genbrug dine stemmer  
✅ Python backend med OpenVoice V2  
✅ Alle dependencies (PyTorch, librosa, scipy, etc.)  
✅ Checkpoints downloaded og klar  
✅ 44.1kHz CD-kvalitet output  
✅ **🔍 Fingerprint Analysis** - STFT-baseret detektion
✅ **🧹 Audio Fingerprint Remover** - Fjern AI vandmærker
✅ **🌐 Production-ready** - basePath + rate limiting
✅ **📄 Landing Page** - Beta marketing page

## Start Applikationen

```bash
cd "/Volumes/G2025/toner fra dengang/ind ad en ny dør/voiceclone projekt/voice-converter"
npm run dev
```

Åbn browser på: **http://localhost:3000**

### Nye URLs:
- **Landing Page:** http://localhost:3000/landing
- **Analyzer (direkte):** http://localhost:3000/?tool=analyzer
- **Cleaner (direkte):** http://localhost:3000/?tool=cleaner

---

## 🆕 NYE FEATURES (Nov 2024)

### 🔍 Forbedret Fingerprint Analysis
- **STFT time-frequency analyse** (ikke bare FFT)
- **Reference-område sammenligning** (18-22 kHz vs 14-18 kHz)
- **Empirisk tuning** - detekterer faktiske vandmærker
- **Før/efter spectrograms** med metrics

**Test det:**
```bash
# Analyser en fil du ved har vandmærker
# Skal vise "🚨 Vandmærke detekteret" hvis present
```

### 🌐 Production Integration
- **basePath support** - Kører under `/tools` i production
- **Rate limiting** - 3 filer per dag per IP (beta fase)
- **Landing page** - Professional marketing page
- **Deep linking** - Åbn værktøjer direkte fra URL
- **Navigation** - Skift mellem værktøjer uden at lukke

### 🔗 Direct Tool Links
Klik på værktøjsknapperne eller brug disse direkte links:
- Fra Analyzer → Cleaner: Klik "Åbn Fingerprint Remover"
- Fra Cleaner → Analyzer: Klik "Åbn Fingerprint-Analyse"

---

## 🧹 BONUS FEATURE: Audio Fingerprint Remover

**Fjern AI-vandmærker fra Suno og andre AI-generatorer**

### Hvad fjernes?

- 🔍 **Spektrale vandmærker** (18-22 kHz ultralyd-mønstre)
- 📊 **Statistiske fingerprints** (unaturlige amplitude patterns)
- 🔇 **Uhørbare markører** (DC offset, subsonic rumble)
- 📝 **Fil metadata** (EXIF, ID3, producer tags)

### Sådan bruger du det:

1. Klik **"🧹 Fjern Fingerprints"** knappen øverst til højre
2. Træk din Suno-genererede lydfil ind (WAV, MP3, etc.)
3. Klik **"Fjern Fingerprints"**
4. Download den rensede fil (~10-30 sek processing)

### Hvornår bruge det?

- ✅ Før professionel udgivelse (sikkerhed)
- ✅ Hvis usikker på Suno Pro watermark-status
- ✅ For andre AI-generatorer (Udio, etc.)
- ❌ **IKKE nødvendigt** hvis du har Suno Pro/Premium (allerede clean)

**Note:** Suno Pro/Premium skulle allerede have vandmærkefri output, men dette værktøj giver 100% sikkerhed.

---

## Sådan Bruger Du Det

### 1. Forbered Filer

**Original Vokal (Source):**
- Export vokal-spor fra Logic (File → Bounce → Select Track)
- Format: WAV anbefales, MP3 virker også
- Kun vokal, ingen instrumenter
- Max 5 minutter

**Din Stemme (Reference) - 3 muligheder:**

**A) Optag Nu (ANBEFALET):**
- Klik "Optag Nu" i interfacet
- Læs den guidede tekst op (1-2 min)
- Pause/resume efter behov
- Gem til voice library for genbrug

**B) Upload eksisterende:**
- Upload tidligere optagelse
- WAV, MP3 eller M4A
- Gem eventuelt til library

**C) Vælg gemt stemme:**
- Brug tidligere gemt stemme fra bibliotek
- Ingen ny optagelse nødvendig

### 2. Upload og Konverter

1. Drag-and-drop eller klik for at uploade begge filer
2. Klik "Konverter Stemme"
3. Vent 30-60 sekunder (afhængig af filstørrelse)
4. Lyt til preview
5. Download result

### 3. Import til Logic

1. Import converted fil til nyt track i Logic
2. Align med instrumental
3. Tilføj processing:
   - EQ (fjern mudder, boost presence)
   - Kompression (glue det sammen)
   - Reverb/Delay (space og dybde)
   - Eventuelt autotune hvis nødvendigt

## Tekniske Detaljer

**Voice Conversion:**
- Bruger OpenVoice V2 (MIT License)
- Processing ved 24kHz (model native SR) for optimal kvalitet
- Upsample til 44.1kHz stereo (CD-kvalitet)
- Bevarer timing, frasering og normalt også pitch naturligt
- **Optional pitch correction:** Kan aktiveres hvis nødvendigt (normalt ikke påkrævet)
- Justerbar Tau (0.3-0.7) for conversion styrke
- Preview mode (20 sek) for hurtig test
- Ingen AI-sporing/watermark i output

**Performance:**
- CPU: ~45-60 sekunder per minut audio (højere kvalitet = lidt længere tid)
- RAM: ~1-2GB konstant (chunk-based processing)
- Voice Library: Gemte stemmer bruges direkte uden re-upload

**Voice Library:**
- Gemmer stemmer lokalt på serveren
- Metadata + audio fil
- Hurtig indlæsning til genbrug
- Ingen størrelsesbegrænsning på antal gemte stemmer

## Begrænsninger

**Hvad det KAN:**
✅ Konvertere eksisterende vokal til din stemme  
✅ Bevare timing og frasering  
✅ **Automatisk bevare original toneart** (pitch correction)  
✅ Fungere på alle sprog  
✅ Håndtere både professionel og lo-fi audio  

**Hvad det IKKE kan:**
❌ Magisk fikse dårlig indsynger-teknik  
❌ Tilføje vibrato du ikke har i reference  
❌ Ændre timing eller rytme (det bevares fra original)  
❌ Fungere uden reference voice sample  
❌ Perfekt matche hvis reference stemme er meget forskellig i range  

## Problemer?

**"Conversion fejlede":**
- Check at begge filer er gyldige audio filer
- Prøv at konvertere til WAV først
- Reducer filstørrelse hvis meget lang

**"Port 3000 optaget":**
```bash
npm run dev -- -p 3001  # Brug anden port
```

**Output lyder mærkeligt:**
- Optag ny reference voice (bedre kvalitet)
- Sørg for at reference er 1-2 min tale (ikke sang)
- Check at original vokal er clean (ingen heavy effects)

## Næste Skridt

1. Test med kort sample først (10-15 sek)
2. Hvis tilfreds, kør hele sangen
3. Eksperimenter med forskellige reference recordings
4. Find den optimale balance mellem din stemme og original performance

## Credits

- **OpenVoice V2** - MyShell.ai, MIT, Tsinghua University
- **Framework** - Next.js + PyTorch
- **License** - MIT (Free for commercial use)

---

**Held og lykke med dit projekt! 🎵**

