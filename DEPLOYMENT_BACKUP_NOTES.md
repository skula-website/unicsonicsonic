# Deployment Backup Notes

**Dato:** 27. November 2025  
**Status:** Backup lavet før deployment

---

## ✅ Backup Information

**Backup Status:** ✅ **BACKUP LAVET**

**Backup Dato:** 27. November 2025  
**Backup Beskrivelse:** Komplet backup af fungerende lokal kode før deployment til Railway

**Backup Indhold:**
- Hele `voice-converter/` mappen
- Alle konfigurationsfiler (Dockerfile, railway.json, .gitignore)
- Alle komponenter og API routes
- Python scripts
- Reference spektrogram (`public/reference-spectrogram.png`)

**Lokal Status:**
- ✅ Koden fungerer lokalt på port 3000
- ✅ Alle features tested og fungerende
- ✅ Ingen kritiske fejl

---

## 📋 Deployment Aftale

**Mål:** Forberede ALT fra kode til GitHub push til Railway deploy

**Ansvar:**
- **AI:** Forbereder alle konfigurationer, kommandoer, scripts
- **Bruger:** Tester kun afslutningsvis, hjælper kun hvis absolut nødvendigt

**Proces:**
1. ✅ Backup dokumenteret (denne fil)
2. ⏳ Verificer kode
3. ⏳ Forbered Git (stage, commit besked)
4. ⏳ Verificer Railway konfiguration
5. ⏳ Identificer manuelle handlinger
6. ⏳ Opret deployment guide med alle kommandoer

---

## 🔄 Rollback Plan

Hvis deployment fejler:
1. Brug backup til at gendanne lokal kode
2. Tjek Railway logs for fejl
3. Verificer GitHub repo er korrekt
4. Ret eventuelle konfigurationsfejl
5. Prøv deployment igen

---

## 📝 Noter

- Backup er placeret separat fra deployment
- Alle ændringer er dokumenteret i commit besked
- Railway projekt: `unicsonicsonic` (gentle-expression)
- GitHub repo: `skula-website/unicsonicsonic`

