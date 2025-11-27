# 🚨 QUICK FIX: UnicSonic Wake-Up Problem

**TL;DR**: Render.com free tier går i dvale og vågner ikke korrekt.

---

## ⚡ HURTIG LØSNING (5 MIN)

### Step 1: Deploy Fixes (ALLEREDE IMPLEMENTERET)

```bash
cd "/Volumes/G2025/asyoulike web/tools/voice-converter"
git add .
git commit -m "Fix: Health check + idempotent builds for wake-up"
git push
```

Vent 5-10 min mens Render deployer.

---

### Step 2: Vælg Din Løsning

#### **Option A: Upgrade til Starter ($7/mnd)** ⭐ ANBEFALET

1. Login: https://render.com/
2. Find `unicsonic` service
3. Settings → Plan → "Upgrade to Starter"
4. **DONE!** Ingen dvale, ingen problemer.

#### **Option B: Setup Keep-Alive (Gratis)**

1. Gå til: https://uptimerobot.com/
2. Opret konto (gratis)
3. Add New Monitor:
   - URL: `https://unicsonic.onrender.com/api/health`
   - Interval: 5 minutes
4. **DONE!** Holder servicen vågen.

---

## 🎯 Hvad Blev Fixet?

1. ✅ **Health Check Endpoint** - `/api/health` (lightweight, ingen Python)
2. ✅ **Idempotent Builds** - Hurtigere wake-up
3. ✅ **Updated render.yaml** - Bruger ny health check

---

## 🧪 Test Det

Efter deployment:

```bash
curl https://unicsonic.onrender.com/api/health
```

Forventet output:
```json
{"status":"ok","timestamp":"...","service":"unicsonic"}
```

---

## 📊 Sammenligning

| Feature | Free + Keep-Alive | Starter ($7/mnd) |
|---------|-------------------|------------------|
| Kostpris | $0 | $7 |
| Always On | ❌ (med tricks) | ✅ |
| Wake-up tid | 30-60 sek | Instant |
| RAM | 512 MB | 1 GB |
| Pålidelighed | ⚠️ Medium | ✅ Høj |
| Professionel | ❌ | ✅ |

---

## 💡 Anbefaling

**For Beta Testing**: Start med Free + UptimeRobot (gratis)  
**For Production**: Upgrade til Starter ($7/mnd)

---

Se `RENDER_WAKE_FIX.md` for detaljeret guide.



