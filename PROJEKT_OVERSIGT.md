# Voice Converter Projekt - Komplet Oversigt

## 📁 Projekt Struktur

```
/Volumes/G2025/toner fra dengang/ind ad en ny dør/voiceclone projekt/
├── OpenVoice/                    # Voice conversion engine
│   ├── venv/                     # Python virtual environment
│   ├── checkpoints_v2/           # Pre-trained models
│   ├── openvoice/                # Core library
│   └── requirements_updated.txt  # Dependencies
│
└── voice-converter/              # Web application
    ├── app/
    │   ├── page.tsx              # Frontend UI
    │   └── api/convert/
    │       └── route.ts          # Backend API
    ├── scripts/
    │   ├── convert_voice.py      # Python conversion script
    │   └── run_conversion.sh     # Shell wrapper
    ├── temp/                     # Upload directory (auto-created)
    ├── output/                   # Output directory (auto-created)
    └── KLAR_TIL_BRUG.md         # Bruger guide
```

## 🚀 Hurtig Start

```bash
# Terminal 1 - I voice-converter directory
cd voice-converter
npm run dev
```

Åbn: http://localhost:3000

## 🔧 Teknisk Stack

### Frontend
- **Next.js 16** - React framework med App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Drag & Drop** - Native browser API

### Backend
- **Next.js API Routes** - Server endpoints
- **Python 3.11** - ML processing
- **PyTorch** - Deep learning framework
- **OpenVoice V2** - Voice conversion model

### Voice Conversion
- **Input:** Original vocal + Reference voice
- **Process:** Extract speaker embeddings → Convert
- **Output:** Vocal in new voice (WAV format)

## 📊 Workflow

1. **User uploads:**
   - Original vocal (source)
   - Reference voice (target)

2. **Server processing:**
   - Save files to temp directory
   - Call Python script via shell wrapper
   - Python loads OpenVoice model
   - Extract speaker embeddings
   - Perform voice conversion
   - Save output to output directory

3. **Client receives:**
   - Converted audio file
   - Download + play in browser

## 🎯 Use Case

**Problem:** Har en sang indspillet af anden sanger, vil bruge min egen stemme.

**Løsning:** Voice Converter transformerer original vokal til din stemme, mens den bevarer:
- Pitch (tonehøjde)
- Timing (rytme)
- Phrasing (frasering)
- Expression (udtryk)

**Resultat:** Professionel vokal i din stemme uden at skulle re-synge.

## 💡 Fordele vs. Alternativer

### Voice Converter (Lokal)
✅ Gratis  
✅ Ingen begrænsninger  
✅ Fuld kontrol  
✅ Privat (data lokalt)  
✅ Kommerciel brug OK  

### Online Tjenester
❌ Kræver betaling  
❌ Upload begrænsninger  
❌ Data på eksterne servere  
❌ Mulige copyright begrænsninger  

## 🔐 Licens & Rettigheder

- **OpenVoice:** MIT License (Free for commercial use)
- **Voice Converter App:** Custom build for dette projekt
- **User Content:** Alle rettigheder tilhører brugeren

## 🐛 Known Issues

1. **Disk space** - Checkpoints kræver ~500MB
2. **MeloTTS** - Ikke installeret (ikke nødvendig for voice conversion)
3. **Processing time** - CPU-only kan være langsomt (GPU anbefales)

## 📈 Performance Metrics

**CPU (Apple Silicon M-series):**
- 1 min audio: ~30-45 sek processing
- 3 min audio: ~90-120 sek processing

**RAM:**
- Idle: ~500MB
- Processing: ~2-4GB

**Disk:**
- Installation: ~2GB total
- Per conversion: ~50-100MB temp files (auto-cleanup)

## 🔮 Mulige Forbedringer

1. **GPU acceleration** - CUDA support for hurtigere processing
2. **Batch processing** - Konverter flere filer samtidig
3. **Real-time preview** - Stream output under processing
4. **Advanced controls** - Pitch shift, formant adjustment
5. **History** - Gem tidligere conversions

## 📞 Support

Se `KLAR_TIL_BRUG.md` for troubleshooting og detaljeret guide.

