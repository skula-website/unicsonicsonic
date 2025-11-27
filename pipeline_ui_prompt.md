
# pipeline_ui_prompt.md

## **Projektvision**
Dette projekt bygger et visuelt og funktionelt interface til et audio-processerings-flow.  
Flowet består af en række processer, repræsenteret som containere i et grid, forbundet af et togskinne-lignende pipeline-system.  
Interfacet skal være moderne, minimalistisk og responsivt — egnet til konstruktion i React + Tailwind (eller hvad Cursor foreslår).

Designet skal følge logikken og strukturen i skitsen:

Referencebillede:  
`/mnt/data/A_hand-drawn_flowchart_titled_"ROAD_TO_DISTRIBUTE".png`

---

## **Overordnet UI-idé**
- Grid af process-containere (3 rækker).  
- Togskinner forbinder containerne visuelt i samme rækkefølge som skitsen.  
- En hovedmonitor øverst viser samlet status.  
- Hver container har et lille statuspanel:  
  - Procesnavn  
  - Mini-progress  
  - Status (Idle → Running → Done → Error)  
- En container kan åbnes (overlay) for at vise en simplificeret visualisering (fx waveform-ikon før/efter eller en simpel grafisk markør).

---

## **Flowrækkefølge (skal følges præcist)**

### **1. række**
1. **Convert Audio** - Format & kvalitet konvertering
   - Auto-detekter input filtype (WAV, MP3, FLAC, M4A, etc.)
   - Output valgmuligheder: WAV eller MP3 (de mest populære)
   - Sample rate conversion: 44.1kHz ↔ 48kHz ↔ 96kHz
   - Bit depth conversion: 16-bit ↔ 24-bit
   - Advarsel ved WAV → MP3: "MP3 er ikke til upload - kvalitet kan mistes" (rød infoboks, ikke modal)
   - Output kan føres direkte til Process 2 (Analyzer)
   - Pipeline-princip: Output forbedres/forædles gennem hver proces
2. Analyze audio  
3. Remove fingerprint  
→ Skinne falder ned til næste række fra container 3.

### **2. række (starter fra højre mod venstre)**
1. Key detect  
2. Tabs detector  
3. Noise remover  
4. Genre detector  
→ Skinne falder ned til række 3 efter venstre container.

### **3. række**
1. Audio trimmer/cutter  
2. Fade in/out  
3. Auto equalizer & normalization  
→ Flow slutter.

---

## **Interaktionsregler**
- Markér aktiv proces med lysende skinne + container animation.  
- Når en proces fuldfører:  
  - Container markeres “Done”.  
  - Togskinnen farves som fuldført.  
- “Main Monitor” viser:  
  - Aktiv procesnavn  
  - Samlet %  

---

## **UI-komponenter Cursor skal bygge**

### **1. `<MainMonitor />`**
- Fast topkomponent  
- Props: `currentStep`, `totalSteps`, `progress`, `log`  

### **2. `<ProcessGrid />`**
- Grid layout med 3 rækker  
- Indeholder alle process-containere  

### **3. `<ProcessContainer />`**
- Props:
  - `title`
  - `status`
  - `progress`

### **4. `<ProcessDetailModal />`**
- Overlay  
- Viser procesforklaring + lille visualisering  

### **5. `<RailNetwork />` (SVG)**
- Tegner togskinner mellem containere  
- Understøtter highlight  

---

## **Stilregler**
- Moderne minimalistisk tema  
- Tailwind farver  
- Rene symboler  
- Konsekvente navne  

---

## **Cursor-adfærd**
1. Brug komponentnavne konsekvent  
2. Generér ét element ad gangen  
3. Hold UI simpelt  
4. Brug flowet præcist  
5. Følg komponentnavne:
   - `MainMonitor`
   - `ProcessGrid`
   - `ProcessContainer`
   - `ProcessDetailModal`
   - `RailNetwork`

---

---

## **Process 1: Convert Audio - Detaljeret Specifikation**

### **Funktionalitet:**
1. **Input:**
   - Auto-detekter filtype fra upload (WAV, MP3, FLAC, M4A, AAC, OGG, etc.)
   - Viser detekteret filtype til brugeren

2. **Output Format Valg:**
   - To primære valgmuligheder: **WAV** eller **MP3**
   - Disse er de mest populære/brugte formater for audioplatforme

3. **Kvalitet Indstillinger:**
   - **Sample Rate:** Dropdown med valgmuligheder:
     - 44.1kHz (CD standard)
     - 48kHz (Video standard)
     - 96kHz (High-res)
   - **Bit Depth:** Dropdown med valgmuligheder:
     - 16-bit (CD standard)
     - 24-bit (High-res)

4. **Advarsel System:**
   - Hvis input er WAV og output er MP3:
     - Vis rød infoboks (ikke modal/popup)
     - Tekst: "⚠️ MP3 er ikke til upload - kvalitet kan mistes"
     - Infoboks skal være lille og diskret, men synlig

5. **Pipeline Integration:**
   - Efter konvertering: Knap "Continue to Analyzer" (Process 2)
   - Output fil sendes automatisk til næste proces
   - Pipeline-princip: Hver proces forbedrer/forædler outputtet

### **UI Komponenter:**
- File upload (drag & drop eller klik)
- Detekteret filtype display
- Output format selector (WAV/MP3)
- Sample rate dropdown
- Bit depth dropdown
- Rød advarsels-infoboks (conditional, kun ved WAV→MP3)
- Convert button
- Progress indicator
- Download button (efter konvertering)
- "Continue to Analyzer" button (efter konvertering)

### **Teknisk Implementation:**
- **Backend:** Python script med `pydub` og `ffmpeg`
- **API Route:** `/api/convert-audio`
- **File Detection:** Baseret på file extension og MIME type
- **Conversion:** Brug eksisterende `convert_to_mp3.py` som reference, udvid til alle formater

---

---

## **✅ Implementeringsstatus (Opdateret: December 2024)**

### **Fuldt Implementerede Processer:**

#### **Process 1: Convert Audio** ✅ **PRODUCTION READY**
- ✅ Auto-detekter input filtype (WAV, MP3, FLAC, M4A, AAC, OGG, etc.)
- ✅ Output format valg: WAV eller MP3
- ✅ Sample rate conversion: 44.1kHz, 48kHz, 96kHz
- ✅ Bit depth conversion: 16-bit, 24-bit (kun for WAV)
- ✅ Auto-preset: WAV → MP3, MP3 → WAV
- ✅ Advarsel ved WAV → MP3 (rød infoboks)
- ✅ Forhindrer WAV→WAV uden kvalitetsændringer
- ✅ Download knap (ikke auto-download)
- ✅ "Continue to Analyzer (using converted file)" knap
- ✅ "Use Original File Instead" knap
- ✅ Navigation til Process 2
- ✅ Responsive design (mobile/tablet/desktop)
- **Backend:** `/api/convert-audio` + `scripts/convert_audio.py`
- **Frontend:** `ConverterContent.tsx`

#### **Process 2: Analyze Audio** ✅ **PRODUCTION READY**
- ✅ Fingerprint detection med STFT analyse
- ✅ Spectrogram visualisering
- ✅ Watermark energy metrics
- ✅ Status: clean/suspicious/watermarked
- ✅ Conditional navigation: Clean → Process 4, Watermarked → Process 3
- ✅ MP3 optimization for store filer (>30MB)
- ✅ Progress tracking og timers
- **Backend:** `/api/analyze-fingerprint` + `scripts/analyze_fingerprint.py`
- **Frontend:** `AnalyzerContent.tsx`

#### **Process 3: Remove Fingerprint** ✅ **PRODUCTION READY**
- ✅ Audio cleaning (fjerner 18-22 kHz watermarks)
- ✅ Before/After energy comparison
- ✅ Streaming download for store filer
- ✅ Progress tracking og timers
- ✅ "Analyzing/verifying result - please wait..." (blinkende orange tekst)
- ✅ Navigation til Process 4
- **Backend:** `/api/clean-audio` + `scripts/remove_audio_fingerprint.py`
- **Frontend:** `CleanerContent.tsx` + `WatermarkEnergyComparison.tsx`

### **Pipeline UI Komponenter** ✅ **FULDT IMPLEMENTERET:**

- ✅ **MainMonitor** - Viser samlet status og progress
- ✅ **ProcessGrid** - Grid layout med 3 rækker, responsive (mobile/desktop)
- ✅ **ProcessContainer** - Container med status, progress, step numbering
- ✅ **ProcessDetailModal** - Modal med zoom-in/out animation
  - Responsive sizing: Desktop (800x720), Tablet (700x660), Mobile (95% viewport)
  - Zoom animation fra container position
  - Navigation mellem processer
- ✅ **RailNetwork** - SVG togskinner der forbinder containere
  - Sequential connections (1→2→3→4...→10)
  - Opacity: Lav inde i containere, høj mellem containere
  - Sleepers på alle vandrette tracks
  - Parallelle lodrette tracks
- ✅ **SidebarPanel** - Auxiliary Tools (collapsible accordion)
  - Closed by default på alle skærme
  - Viser tool titles når collapsed (meget lille skrift)
- ✅ **Lyrics Formatter** - Auxiliary tool
  - Apple Music og Spotify formatting
  - localStorage persistence
  - Auto-removal af non-lyrical content

### **Features Implementeret:**

- ✅ File transfer mellem processer
- ✅ Zoom animation for modals
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Progress tracking og timers
- ✅ Error handling med klare fejlbeskeder
- ✅ Streaming downloads for store filer
- ✅ Conditional navigation baseret på resultater

### **Ikke Implementeret (Fremtidige Processer):**

- 🔲 Process 4: Key Detect
- 🔲 Process 5: Tabs Detector
- 🔲 Process 6: Noise Remover
- 🔲 Process 7: Genre Detector
- 🔲 Process 8: Audio Trimmer
- 🔲 Process 9: Fade In/Out
- 🔲 Process 10: Auto EQ & Normalization

---

## **Mål**
Et dashboard-UI, der visualiserer hele pipeline-forløbet i moderne stil.

**Status:** Process 1-3 er fuldt implementeret og production-ready. Pipeline UI er komplet med alle nødvendige komponenter.

