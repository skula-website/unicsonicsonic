# UnicSonic Deployment Guide - Render.com

**Step-by-step guide til at deploye UnicSonic til Render.com**

---

## 📋 Før Vi Starter

### Hvad Du Skal Bruge

1. ✅ Render.com konto (gratis at oprette)
2. ✅ GitHub/GitLab konto (til repository)
3. ✅ Projektet klar i `/Volumes/G2025/asyoulike web/tools/`

### Omkostninger

- **Free Tier:** $0/måned - går i dvale efter 15 min
- **Starter Plan:** $7/måned - always on, 1 GB RAM (ANBEFALET)

---

## 🚀 Step 1: Push Til Git Repository

### Opret Git Repository

```bash
# Gå til project mappen
cd "/Volumes/G2025/asyoulike web/tools/voice-converter"

# Initialiser git (hvis ikke allerede gjort)
git init

# Tilføj alle filer
git add .

# Commit
git commit -m "Initial commit - UnicSonic ready for deployment"
```

### Push til GitHub/GitLab

**Option A: GitHub**
```bash
# Opret nyt repository på github.com
# Derefter:
git remote add origin https://github.com/DIT-BRUGERNAVN/unicsonic.git
git branch -M main
git push -u origin main
```

**Option B: GitLab**
```bash
# Opret nyt repository på gitlab.com
# Derefter:
git remote add origin https://gitlab.com/DIT-BRUGERNAVN/unicsonic.git
git branch -M main
git push -u origin main
```

---

## 🔧 Step 2: Opret Service På Render.com

### 2.1 Login til Render.com

Gå til: https://render.com/

### 2.2 Opret Ny Web Service

1. Klik på **"New +"** i toppen
2. Vælg **"Web Service"**

### 2.3 Connect Repository

1. Vælg **"Connect a repository"**
2. Authoriser GitHub eller GitLab
3. Find dit `unicsonic` repository
4. Klik **"Connect"**

---

## ⚙️ Step 3: Configure Service

### 3.1 Basic Settings

**Name:** `unicsonic` (eller hvad du vil)

**Region:** `Frankfurt (EU Central)` (tættest på Danmark)

**Branch:** `main`

**Root Directory:** (lad være blank)

### 3.2 Build Settings

**Runtime:** `Node`

**Build Command:**
```bash
npm install && npm run build && cd ../OpenVoice && pip3 install -r requirements.txt && pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

**Start Command:**
```bash
npm start
```

### 3.3 Environment Variables

Klik **"Advanced"** → **"Add Environment Variable"**

Tilføj:
```
NODE_ENV = production
PYTHON_VERSION = 3.11.0
```

### 3.4 Plan Selection

**Free:** $0/måned
- ✅ Gratis
- ❌ Går i dvale efter 15 min inaktivitet
- ❌ Langsom wake-up (30-60 sekunder)

**Starter:** $7/måned (ANBEFALET)
- ✅ Always on
- ✅ 1 GB RAM
- ✅ Hurtig respons
- ✅ Professionel oplevelse

**Vælg plan og klik "Create Web Service"**

---

## ⏳ Step 4: Vent På Deployment

### Hvad Sker Der?

1. **Cloning repository** (~10 sekunder)
2. **Installing Node.js dependencies** (~1-2 minutter)
3. **Building Next.js** (~1-2 minutter)
4. **Installing Python dependencies** (~3-5 minutter)
5. **Downloading PyTorch & OpenVoice** (~2-3 minutter)

**Total tid:** 7-13 minutter

### Følg Progress

Du kan se live logs i Render.com dashboard:
- Grønne checkmarks = success
- Røde crosses = fejl

### Common Issues

**Issue 1: Python version error**
```
ERROR: Python 3.12 not supported
```
**Fix:** Tilføj environment variable `PYTHON_VERSION = 3.11.0`

**Issue 2: Out of memory**
```
FATAL ERROR: Reached heap limit
```
**Fix:** Upgrade til Starter plan ($7/mnd) med mere RAM

**Issue 3: PyTorch installation fails**
```
ERROR: Could not find a version that satisfies the requirement torch
```
**Fix:** Build command skal inkludere `--index-url https://download.pytorch.org/whl/cpu`

---

## ✅ Step 5: Test Din Deployment

### 5.1 Find Din URL

Efter deployment er færdig, får du en URL:
```
https://unicsonic.onrender.com
```

### 5.2 Test Alle Features

**Test 1: Voice Converter**
1. Gå til homepage
2. Upload reference voice
3. Upload original audio
4. Klik "Convert Voice"
5. Vent på result
6. Download og verificer

**Test 2: Fingerprint Analyzer**
1. Klik "Fingerprint Analyzer"
2. Upload AI-generated audio
3. Vent på analyse
4. Verificer spectrogram vises
5. Check metrics er korrekte

**Test 3: Audio Cleaner**
1. Klik "Audio Cleaner"
2. Upload audio med watermark
3. Klik "Remove Fingerprints"
4. Verificer before/after comparison
5. Download cleaned audio

---

## 🌐 Step 6: Custom Domain (Valgfrit)

### Hvis Du Vil Bruge Eget Domain

**Option A: Subdomain (Anbefalet)**
```
unicsonic.asyoulike.dk
```

**Setup:**
1. Gå til Render.com dashboard
2. Klik på din service
3. Gå til "Settings" → "Custom Domains"
4. Klik "Add Custom Domain"
5. Indtast: `unicsonic.asyoulike.dk`
6. Render giver dig en CNAME record
7. Gå til Nordicway DNS settings
8. Tilføj CNAME record der peger til Render

**Option B: Separat Domain**
```
unicsonic.com (eller andet)
```
Du skal købe nyt domain og opsætte DNS.

---

## 📊 Step 7: Monitoring

### Render.com Dashboard

Log ind på Render.com for at se:
- **Metrics:** CPU, Memory, Response time
- **Logs:** Real-time application logs
- **Deployments:** History og rollback muligheder

### Key Metrics At Overvåge

**CPU Usage:**
- Normal: 10-30%
- High: >60% (overvej upgrade)

**Memory Usage:**
- Free tier: max 512 MB
- Starter: max 1 GB

**Response Time:**
- Voice conversion: 10-30 sekunder (normal)
- Fingerprint analysis: 3-5 sekunder (normal)
- Audio cleaning: 5-10 sekunder (normal)

---

## 🔧 Troubleshooting

### Problem: Service Går I Dvale (Free Tier)

**Symptom:** Første request tager 30-60 sekunder

**Løsninger:**
1. **Upgrade til Starter ($7/mnd)** - Permanent fix
2. **Brug cron job** - Ping service hver 14 min (gratis workaround)
3. **Acceptér det** - OK til testing, ikke til produktion

### Problem: Out Of Memory

**Symptom:** Service crasher under processing

**Fix:** Upgrade til større plan med mere RAM

### Problem: Python Scripts Fejler

**Symptom:** API calls returnerer 500 errors

**Debug:**
1. Check logs i Render.com dashboard
2. Verificer Python version er 3.11
3. Verificer alle dependencies er installeret
4. Test scripts lokalt først

### Problem: Audio Files Upload Fejler

**Symptom:** Upload timeout eller fails

**Causes:**
- File for stor (>50 MB)
- Netværk timeout

**Fix:**
- Komprimer audio før upload
- Øg timeout i API routes

---

## 💰 Omkostnings Oversigt

### Free Tier
```
✅ Hosting: $0/mnd
✅ Bandwidth: Ubegrænset
✅ Deployments: Ubegrænset
❌ Service går i dvale
```

### Starter Plan ($7/mnd)
```
✅ Always on
✅ 1 GB RAM
✅ Hurtigere CPU
✅ Professionel oplevelse
✅ Custom domain
```

### Pro Plan ($25/mnd)
```
✅ Alt fra Starter
✅ 4 GB RAM
✅ Endnu hurtigere
✅ Priority support
```

---

## 🎯 Anbefalinger

### For Testing (1-2 uger)
- Start med **Free tier**
- Test alle features grundigt
- Inviter beta testere
- Samle feedback

### For Beta Launch
- Upgrade til **Starter ($7/mnd)**
- Setup custom domain
- Enable monitoring
- Implementer error tracking

### For Production
- **Starter** er nok til 100-500 brugere/dag
- **Pro** hvis du får >1000 brugere/dag
- Overvej database for bruger-tracking
- Implementer analytics (Google Analytics, etc.)

---

## 📞 Support

**Render.com Support:**
- Community: https://community.render.com/
- Docs: https://render.com/docs
- Status: https://status.render.com/

**UnicSonic Support:**
- Ejer: Michael Juhl
- MIKS SYNDICATE

---

## ✨ Tillykke!

Du har nu deployed UnicSonic til Render.com! 🎉

**Næste skridt:**
1. Test alle features
2. Invite beta testere
3. Samle feedback
4. Iterer på features
5. Launch! 🚀

---

**Guide Version:** 1.0  
**Dato:** 23. November 2024


