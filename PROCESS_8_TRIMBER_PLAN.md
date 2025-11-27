# Process 8: Audio Trimmer - Planlægning og Implementering

**Dato:** 27. November 2025  
**Status:** Planlægning og Implementering  
**Forfatter:** AI Assistant

---

## 🎯 Formål

Process 8 (Audio Trimmer) giver brugeren mulighed for at:
- **Primært:** Justere starttidspunkt og sluttidspunkt for en audiofil
- **Sekundært:** Klippe/trimme audio til specifikke sektioner
- **Bevare original:** Original fil gemmes og kan genkaldes
- **Erstatte original:** Mulighed for at erstatte original med klippet version (med advarsel)

---

## 📋 Funktionelle Krav

### Core Features

1. **Fil Upload/Modtagelse**
   - Modtage fil fra Process 7 (Genre Detector) - forberedt, men ikke implementeret endnu
   - Træk-fil-ind funktionalitet i modalvindue
   - Support for alle audioformater (WAV, MP3, FLAC, M4A, etc.)

2. **Waveform Visualisering**
   - Grafisk/visuelt billede af filens dynamik over tid
   - Playline viser hvor man er i afspilningen
   - Farve-kodning baseret på afspilningsposition
   - Responsive design (mobile/tablet/desktop)

3. **Trimming Interface**
   - Drag handles i højre og venstre side for at markere start/slut
   - Visuel markering af valgt område
   - Real-time preview af valgt område
   - Tidsangivelser (start/slut/længde)

4. **Afspilning**
   - Play/Pause kontrol
   - Afspilning farver waveform baseret på position
   - Loop af valgt område (optional)
   - Speed control (optional, fremtidig feature)

5. **Output**
   - Download klippet fil
   - Gemme original fil (kan genkaldes)
   - Erstatte original med klippet version (med advarsel)
   - Filnavn-normalisering (følger eksisterende pattern)

---

## 🎨 UI/UX Design Principper

### Inspiration fra Best Practices

**Waveform Libraries:**
- **Wavesurfer.js** - Populær, men kan være overfyldt
- **Waveform Playlist** - Simpel og let
- **Custom Canvas-based** - Fuld kontrol, men mere arbejde

**Design Principper:**
1. **Simplicitet først** - Ikke overfyldt med features
2. **Glidende interaktion** - Smooth drag, real-time feedback
3. **Visuel klarhed** - Klar markering af valgt område
4. **Intuitive kontroller** - Standard play/pause, drag handles

### UI Komponenter

```
┌─────────────────────────────────────────┐
│  Audio Trimmer                          │
├─────────────────────────────────────────┤
│                                         │
│  [Upload/Drop File Area]                │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Waveform Visualization         │   │
│  │  [====|====|====|====|====|====]│   │
│  │  ◄─── Selected Area ───►        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Time: 0:00 ──────────── 3:45          │
│  Selected: 0:30 ──────── 2:15          │
│                                         │
│  [◄◄] [▶] [►►] [Loop]                  │
│                                         │
│  [Download Trimmed] [Replace Original] │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🏗️ Teknisk Arkitektur

### Frontend Komponenter

1. **TrimmerContent.tsx** (Main Component)
   - File upload/drop handling
   - State management (file, selection, playback)
   - API integration

2. **WaveformVisualization.tsx** (New Component)
   - Canvas-based waveform rendering
   - Drag handles for start/end selection
   - Playback position indicator
   - Color coding based on playback

3. **AudioPlayer.tsx** (New Component)
   - HTML5 Audio API integration
   - Play/Pause controls
   - Time display
   - Loop functionality

### Backend API

1. **`/api/trim-audio`** (New Route)
   - Input: Audio file + start time + end time
   - Output: Trimmed audio file
   - Python script: `scripts/trim_audio.py`

### Python Script

**`scripts/trim_audio.py`**
- Input: audio file, start_seconds, end_seconds
- Output: trimmed audio file
- Uses: `pydub` for audio trimming
- Format: Preserves original format

---

## 📝 Implementerings Plan

### Phase 1: Dokumentation og Planlægning ✅
- [x] Undersøge best practices
- [x] Dokumentere krav
- [x] Design UI/UX
- [x] Planlægge arkitektur

### Phase 2: Backend Implementation
- [ ] Oprette `scripts/trim_audio.py`
- [ ] Oprette `/api/trim-audio` route
- [ ] Teste backend funktionalitet

### Phase 3: Frontend Core
- [ ] Oprette `TrimmerContent.tsx`
- [ ] Oprette `WaveformVisualization.tsx`
- [ ] Oprette `AudioPlayer.tsx`
- [ ] Integrere i `page.tsx`

### Phase 4: UI/UX Polish
- [ ] Drag handles styling
- [ ] Waveform rendering optimization
- [ ] Playback position coloring
- [ ] Responsive design

### Phase 5: Advanced Features
- [ ] Original file preservation
- [ ] Replace original with warning
- [ ] File transfer to next process
- [ ] Error handling

---

## 🔧 Tekniske Detaljer

### Waveform Generation

**Approach:** Client-side waveform generation using Web Audio API
- Load audio file
- Decode audio data
- Calculate RMS/Peak values per time segment
- Render on Canvas

**Alternative:** Server-side waveform generation (slower, but more accurate)

### Audio Trimming

**Library:** `pydub` (already in requirements)
```python
from pydub import AudioSegment

audio = AudioSegment.from_file(input_path)
trimmed = audio[start_ms:end_ms]
trimmed.export(output_path, format=output_format)
```

### File Handling

- **Input:** Any audio format (WAV, MP3, FLAC, etc.)
- **Output:** Same format as input (or user choice)
- **Naming:** Follow existing normalization pattern
- **Storage:** Temp directory, cleanup after download

---

## ⚠️ Overvejelser

1. **Performance:** Store filer kan være langsomme at visualisere
   - **Solution:** Downsample for visualization, full quality for trimming

2. **Browser Compatibility:** Web Audio API support
   - **Solution:** Feature detection, fallback to server-side

3. **Mobile Support:** Touch interactions for drag handles
   - **Solution:** Touch event handlers, larger hit areas

4. **File Size Limits:** Railway timeout for store filer
   - **Solution:** Client-side trimming for small files, server-side for large

---

## 📚 Referencer

- Wavesurfer.js: https://wavesurfer-js.org/
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- Pydub Documentation: https://github.com/jiaaro/pydub

---

## ✅ Næste Skridt

1. Implementere backend (`trim_audio.py` + API route)
2. Implementere frontend core komponenter
3. Integrere i pipeline
4. Test og polish

---

**Status:** Klar til implementering

