# 🔧 Manuelle Handlinger - Deployment til Railway

**Dato:** 27. November 2025  
**Status:** Identificeret manuelle steps

---

## ✅ Automatiske Steps (Ingen handling nødvendig)

1. ✅ Git staging - **AUTOMATISK** (via script)
2. ✅ Git commit - **AUTOMATISK** (via script)
3. ✅ Git push - **AUTOMATISK** (via script)
4. ✅ Railway build - **AUTOMATISK** (triggered af push)
5. ✅ Railway deployment - **AUTOMATISK** (efter build)

---

## 🔧 Manuelle Handlinger (Kun hvis nødvendigt)

### 1. Kør Deployment Script

**Dette er det ENESTE manuelle step der er absolut nødvendigt:**

```bash
cd "/Volumes/G2025/asyoulike web/tools"
./DEPLOYMENT_COMMANDS.sh
```

**Eller manuelt:**
```bash
cd "/Volumes/G2025/asyoulike web/tools"
git add .
git commit -m "feat: Complete UnicSonic pipeline..."
git push origin main
```

---

### 2. Verificer GitHub Push (Anbefalet)

**Efter push, tjek:**
1. Gå til: https://github.com/skula-website/unicsonicsonic
2. Verificer at alle filer er committet
3. Verificer at `voice-converter/` mappen er inkluderet
4. Verificer at `Dockerfile` og `railway.json` er i root

**Tid:** ~2 minutter

---

### 3. Verificer Railway Deployment (Anbefalet)

**Efter push, tjek Railway:**
1. Gå til Railway dashboard
2. Find projektet `gentle-expression`
3. Tjek at deployment starter automatisk
4. Monitor build logs

**Tid:** ~5-10 minutter (venter på build)

---

### 4. Test Deployment (Anbefalet)

**Efter deployment, test:**
1. Find Railway URL (fx `unicsonicsonic-production.up.railway.app`)
2. Test at appen loader
3. Test Process 1 (Convert Audio)
4. Test Process 2 (Analyze Audio)
5. Test Process 3 (Remove Fingerprint)

**Tid:** ~5 minutter

---

## 🚨 Hvis Noget Går Galt

### Problem: Railway starter ikke automatisk

**Manuel handling:**
1. Gå til Railway dashboard
2. Klik på projektet `gentle-expression`
3. Klik "Deploy" eller "Redeploy"

**Tid:** ~1 minut

---

### Problem: Build fejler

**Manuel handling:**
1. Tjek Railway logs for fejl
2. Verificer at Dockerfile paths er korrekte
3. Verificer at alle dependencies er i `requirements-python.txt`
4. Ret fejl og push igen

**Tid:** Varierer (afhænger af fejl)

---

### Problem: Deployment fejler

**Manuel handling:**
1. Tjek Railway logs for fejl
2. Verificer at port er korrekt (Railway sætter PORT automatisk)
3. Verificer at `npm start` kører korrekt
4. Ret fejl og push igen

**Tid:** Varierer (afhænger af fejl)

---

## 📋 Summary

**Absolut nødvendige manuelle steps:**
1. ✅ Kør deployment script (eller manuelle git kommandoer)

**Anbefalede manuelle steps:**
2. ✅ Verificer GitHub push
3. ✅ Verificer Railway deployment
4. ✅ Test deployment

**Total tid:** ~15-20 minutter (hvis alt går godt)

---

## ✅ Checklist

- [ ] Kør deployment script
- [ ] Verificer GitHub push
- [ ] Verificer Railway deployment starter
- [ ] Monitor Railway build logs
- [ ] Test appen på Railway URL
- [ ] Test alle 3 processer
- [ ] Verificer spektrogram visualization
- [ ] Verificer risk categorization

---

## 🎉 Deployment Complete

Når alle steps er gennemført:
- ✅ App kører på Railway
- ✅ Alle features virker
- ✅ Ready for production use

