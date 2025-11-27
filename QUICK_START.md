# 🚀 UnicSonic - Quick Start Guide

**Alt du skal vide for at komme i gang HURTIGT**

---

## 📁 Hvor Er Alt?

```
/Volumes/G2025/asyoulike web/tools/
├── voice-converter/              ← Next.js app (deploy denne!)
├── OpenVoice/                    ← Python backend (inkluderes automatisk)
├── README.md                     ← Kort oversigt
├── UNICSONIC_KOMPLET_DOKUMENTATION.md  ← Fuld teknisk dokumentation
├── RENDER_DEPLOYMENT_GUIDE.md    ← Step-by-step deployment guide
└── QUICK_START.md               ← Denne fil!
```

---

## ⚡ Test Lokalt (5 min)

```bash
# 1. Gå til mappen
cd "/Volumes/G2025/asyoulike web/tools/voice-converter"

# 2. Start serveren
npm run dev

# 3. Åbn browser
# http://localhost:3000
```

**Det virker!** ✅

---

## 🚀 Deploy Til Render.com (15 min)

### Option 1: Hurtig Guide

1. **Push til Git:**
   ```bash
   cd "/Volumes/G2025/asyoulike web/tools/voice-converter"
   git init
   git add .
   git commit -m "Ready for deployment"
   # Push til GitHub/GitLab
   ```

2. **Opret på Render.com:**
   - Gå til https://render.com/
   - New + → Web Service
   - Connect repository
   - Runtime: Node
   - Build command: Se nedenfor
   - Start command: `npm start`
   - Vælg plan (Free eller $7/mnd)
   - Deploy!

3. **Build Command:**
   ```bash
   npm install && npm run build && cd ../OpenVoice && pip3 install -r requirements.txt && pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
   ```

### Option 2: Detaljeret Guide

Se: `RENDER_DEPLOYMENT_GUIDE.md` for fuld step-by-step guide.

---

## 📖 Fuld Dokumentation

**Hvis du vil vide ALT:**

Læs: `UNICSONIC_KOMPLET_DOKUMENTATION.md`

Indeholder:
- Komplet arkitektur
- Kode-oversigt
- Alle komponenter forklaret
- Troubleshooting
- Tekniske detaljer

---

## 💰 Hvad Koster Det?

### Render.com Pricing

**Free:**
- $0/måned
- Går i dvale efter 15 min
- God til testing

**Starter (ANBEFALET):**
- $7/måned
- Always on
- Professionel oplevelse

---

## ⚠️ Vigtige Noter

1. **Python Version:** Skal være 3.8-3.11 (IKKE 3.12+)
2. **Disk Space:** ~2.5 GB total (primært ML models)
3. **Første Deploy:** Tager 7-13 minutter (download af models)
4. **Memory:** 512 MB (free) eller 1 GB (starter) RAM

---

## 🆘 Problemer?

### Lokal Server Virker Ikke

```bash
# Ryd cache og genstart
rm -rf .next
npm run dev
```

### Deploy Fejler

**Check:**
1. Python version er sat til 3.11.0
2. Build command er korrekt
3. Repository er pushed til Git
4. Se logs i Render.com dashboard

**Fuld troubleshooting:** Se `RENDER_DEPLOYMENT_GUIDE.md`

---

## 🧹 Cleanup

Før deployment, ryd temp filer:

```bash
cd "/Volumes/G2025/asyoulike web/tools/voice-converter"
./cleanup.sh
```

Dette frigjorde 514 MB ved sidste kørsel!

---

## 📞 Hvem Har Lavet Dette?

**Michael Juhl / MIKS SYNDICATE**

Alle rettigheder tilhører Michael Juhl.

---

## ✨ Næste Skridt

1. ✅ Test lokalt
2. ✅ Ryd temp filer (`./cleanup.sh`)
3. ✅ Push til Git
4. ✅ Deploy til Render.com
5. ✅ Test live
6. 🎉 Launch!

---

**Held og lykke!** 🚀


