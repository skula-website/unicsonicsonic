# 🚀 Deployment Guide - Integration med asyoulike.dk

## 📋 Oversigt

Voice Converter skal køres som **selvstændig Next.js server** på port 3000 og tilgås via reverse proxy fra asyoulike.dk under `/tools`.

**Vigtigt:** Dette er IKKE en statisk site (bruger Python backend) - kan ikke uploades via FTP alene.

---

## 🏗️ Arkitektur

```
Internet
    ↓
asyoulike.dk (port 80/443)
    ↓
Nginx Reverse Proxy
    ├─→ / (root)          → Static asyoulike.dk site
    └─→ /tools            → Voice Converter (localhost:3000)
                              ├─→ Next.js frontend
                              └─→ Python backend (OpenVoice)
```

---

## 🛠️ Server Requirements

### Minimum Specs:
- **OS:** Linux (Ubuntu 20.04+ anbefalet) eller macOS
- **CPU:** 4+ cores (processing er CPU-intensiv)
- **RAM:** 4GB minimum, 8GB anbefalet
- **Storage:** 20GB+ fri plads
- **Python:** 3.9 eller 3.10
- **Node.js:** 18+ (LTS)
- **Nginx:** Latest stable

### Software Dependencies:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nginx python3.10 python3.10-venv nodejs npm git

# macOS (via Homebrew)
brew install nginx python@3.10 node
```

---

## 📦 Installation på Server

### Step 1: Clone/Upload Project

**Option A: Via Git (anbefalet)**
```bash
# På serveren
cd /var/www
sudo git clone [YOUR_REPO_URL] voice-converter
sudo chown -R $USER:$USER voice-converter
cd voice-converter
```

**Option B: Via FTP + Terminal**
```bash
# 1. Upload hele voice-converter folder via FTP til /var/www/voice-converter
# 2. SSH til serveren og cd til mappen
cd /var/www/voice-converter
```

### Step 2: Installer OpenVoice (Python Backend)

```bash
# Clone OpenVoice (hvis ikke allerede gjort lokalt)
cd ..
git clone https://github.com/myshell-ai/OpenVoice.git
cd OpenVoice

# Opret virtual environment
python3.10 -m venv venv
source venv/bin/activate

# Installer dependencies
pip install --upgrade pip
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt

# Download checkpoints (hvis ikke uploadet)
# (Checkpoints skal være i OpenVoice/checkpoints_v2/)
```

### Step 3: Installer Next.js Dependencies

```bash
cd ../voice-converter
npm install
```

### Step 4: Build Next.js App

```bash
# Production build
npm run build

# Test at det virker
NODE_ENV=production npm start
# Skulle starte på port 3000
```

### Step 5: Sæt Nginx Reverse Proxy Op

**Rediger Nginx config:**
```bash
sudo nano /etc/nginx/sites-available/asyoulike.dk
```

**Tilføj denne config:**
```nginx
server {
    listen 80;
    server_name asyoulike.dk www.asyoulike.dk;
    
    # Root for main asyoulike.dk site
    root /var/www/asyoulike.dk;
    index index.html index.htm;
    
    # Main website (static files)
    location / {
        try_files $uri $uri/ =404;
    }
    
    # Voice Converter (reverse proxy til Next.js)
    location /tools {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings (audio processing kan tage tid)
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        send_timeout 300;
    }
    
    # Tillad større uploads (audio files)
    client_max_body_size 50M;
}
```

**Aktiver config og restart:**
```bash
sudo ln -s /etc/nginx/sites-available/asyoulike.dk /etc/nginx/sites-enabled/
sudo nginx -t  # Test config
sudo systemctl restart nginx
```

### Step 6: Sæt Process Manager Op (PM2)

**Installer PM2:**
```bash
sudo npm install -g pm2
```

**Start Voice Converter:**
```bash
cd /var/www/voice-converter

# Start med PM2
NODE_ENV=production pm2 start npm --name "voice-converter" -- start

# Sæt til at starte ved reboot
pm2 startup
pm2 save
```

**PM2 Commands:**
```bash
pm2 status              # Se status
pm2 logs voice-converter # Se logs
pm2 restart voice-converter # Restart efter opdateringer
pm2 stop voice-converter    # Stop
```

---

## 🔗 Integration med asyoulike.dk

### Tilføj Link i Header

**I din asyoulike.dk/index.html:**
```html
<header>
  <nav>
    <a href="/">Hjem</a>
    <a href="/om">Om</a>
    <!-- Tilføj dette link: -->
    <a href="/tools/landing">🎵 Audio Tools</a>
  </nav>
</header>
```

### Direkte Links til Værktøjer

```html
<!-- Fingerprint Analysis -->
<a href="/tools?tool=analyzer">🔍 Analyze Audio</a>

<!-- Fingerprint Removal -->
<a href="/tools?tool=cleaner">🧹 Clean Audio</a>

<!-- Voice Converter -->
<a href="/tools">🎤 Voice Converter</a>
```

---

## ✅ Verificer Installation

### Test Checklist:

1. **Main site virker:**
   ```
   http://asyoulike.dk → Din normale hjemmeside
   ```

2. **Landing page virker:**
   ```
   http://asyoulike.dk/tools/landing → Beta landing page
   ```

3. **Analyzer åbner:**
   ```
   http://asyoulike.dk/tools?tool=analyzer
   ```

4. **Cleaner åbner:**
   ```
   http://asyoulike.dk/tools?tool=cleaner
   ```

5. **Voice converter virker:**
   ```
   http://asyoulike.dk/tools → Main app
   ```

6. **Upload og process test:**
   - Upload en lydfil
   - Tjek at analysis/removal virker
   - Verificer download

7. **Rate limiting virker:**
   - Process 3 filer
   - 4. fil skulle give "Daily limit reached" error

---

## 🔧 Maintenance & Updates

### Opdater Kode

```bash
# SSH til server
cd /var/www/voice-converter

# Pull updates (hvis git)
git pull

# Eller upload nye filer via FTP

# Rebuild
npm install  # Kun hvis package.json ændret
npm run build

# Restart
pm2 restart voice-converter

# Verificer
pm2 logs voice-converter
```

### Monitor Logs

```bash
# Next.js logs
pm2 logs voice-converter

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System resources
htop
```

### Backup

```bash
# Backup user data (gemte stemmer)
tar -czf backup-voices-$(date +%Y%m%d).tar.gz /var/www/voice-converter/saved_voices/

# Backup processed files (optional)
tar -czf backup-output-$(date +%Y%m%d).tar.gz /var/www/voice-converter/output/
```

---

## ⚠️ Troubleshooting

### Problem: 502 Bad Gateway
**Årsag:** Next.js server ikke kørende
```bash
pm2 status
pm2 restart voice-converter
pm2 logs voice-converter
```

### Problem: Upload fejler
**Årsag:** Nginx client_max_body_size for lav
```bash
# I nginx config, tilføj:
client_max_body_size 50M;

sudo systemctl restart nginx
```

### Problem: Python processing fejler
**Årsag:** OpenVoice venv ikke aktiveret eller checkpoints mangler
```bash
cd /var/www/OpenVoice
ls checkpoints_v2/  # Skal indeholde converter, base_speakers
source venv/bin/activate
python -c "import torch; print(torch.__version__)"  # Verificer PyTorch
```

### Problem: Rate limiting virker ikke
**Årsag:** IP header ikke forwarded korrekt
```bash
# I nginx config, sørg for:
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

### Problem: Høj server load
**Løsning:** Juster rate limiting i `app/middleware.ts`
```typescript
const MAX_REQUESTS = 2;  // Reducer fra 3 til 2
```

---

## 🔐 Security Checklist

- [ ] Nginx reverse proxy konfigureret
- [ ] Rate limiting aktiveret (3 files/dag)
- [ ] File size limits (50MB)
- [ ] Temp files slettes efter processing
- [ ] HTTPS/SSL certificat (via Let's Encrypt)
- [ ] Firewall tillader kun port 80/443
- [ ] PM2 process isolation
- [ ] Regular security updates

### Tilføj SSL (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d asyoulike.dk -d www.asyoulike.dk
sudo certbot renew --dry-run  # Test auto-renewal
```

---

## 📊 Analytics Setup

### Google Analytics

**Tilføj i `app/layout.tsx`:**
```typescript
// Tilføj i <head>
<Script
  src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
  strategy="afterInteractive"
/>
<Script id="google-analytics" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  `}
</Script>
```

---

## 🎯 Go-Live Checklist

- [ ] OpenVoice installeret og testet
- [ ] Next.js bygget og kører på port 3000
- [ ] PM2 process manager kører voice-converter
- [ ] Nginx reverse proxy konfigureret
- [ ] Link tilføjet i asyoulike.dk header
- [ ] SSL certificat aktiveret
- [ ] Rate limiting testet
- [ ] Upload/download testet
- [ ] Analytics tracking aktiveret
- [ ] Backup strategi på plads
- [ ] Monitoring aktiveret (PM2 + logs)

---

## 💰 Estimerede Server Costs

**Shared Hosting:** Ikke muligt (kræver Node.js + Python + reverse proxy)

**VPS (anbefalet):**
- DigitalOcean Droplet (4GB RAM): ~$24/måned
- Linode (4GB RAM): ~$24/måned
- Hetzner Cloud (4GB RAM): ~€10/måned (~75 kr.)

**Alternative:**
- Køre på din egen computer (hvis fast IP)
- Upgrade eksisterende server (hvis du allerede har én)

---

## 📞 Support Resources

**Nginx dokumentation:**
https://nginx.org/en/docs/

**PM2 dokumentation:**
https://pm2.keymetrics.io/docs/

**Next.js deployment:**
https://nextjs.org/docs/deployment

**OpenVoice repo:**
https://github.com/myshell-ai/OpenVoice

---

**Version:** 1.0  
**Last Updated:** 2024-11-22  
**Tested på:** Ubuntu 22.04 LTS

