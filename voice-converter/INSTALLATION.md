# Voice Converter - Installation Guide

## Forudsætninger

- Python 3.9 eller nyere
- Node.js 18 eller nyere
- Mindst 4GB RAM
- Internet forbindelse (til download af checkpoints)

## Trin-for-trin Installation

### 1. Python Dependencies

```bash
# Naviger til OpenVoice directory
cd ../OpenVoice

# Opret Python virtual environment (anbefalet)
python3 -m venv venv
source venv/bin/activate  # På macOS/Linux
# eller
venv\Scripts\activate  # På Windows

# Installer OpenVoice dependencies
pip install -e .

# Installer MeloTTS (påkrævet for V2)
pip install git+https://github.com/myshell-ai/MeloTTS.git
python -m unidic download
```

### 2. Download Checkpoints

OpenVoice V2 checkpoints skal downloades:

```bash
# Naviger til OpenVoice directory
cd ../OpenVoice

# Download checkpoints (ca. 500MB)
curl -O https://myshell-public-repo-host.s3.amazonaws.com/openvoice/checkpoints_v2_0417.zip

# Udpak checkpoints
unzip checkpoints_v2_0417.zip

# Checkpoints skal nu være i: OpenVoice/checkpoints_v2/
```

### 3. Node.js Dependencies

```bash
# Naviger til voice-converter directory
cd ../voice-converter

# Installer npm packages
npm install
```

## Verificer Installation

Test om alt er installeret korrekt:

```bash
# Test Python installation
cd ../OpenVoice
source venv/bin/activate
python -c "import torch; from openvoice.api import ToneColorConverter; print('✓ OpenVoice installeret korrekt')"

# Test Next.js
cd ../voice-converter
npm run dev
```

## Start Applikationen

```bash
cd voice-converter
npm run dev
```

Åbn browser på: http://localhost:3000

## Troubleshooting

### Python module not found
- Sørg for at virtual environment er aktiveret
- Kør `pip install -e .` igen i OpenVoice directory

### Checkpoints ikke fundet
- Verificer at `OpenVoice/checkpoints_v2/converter/` findes
- Download checkpoints igen hvis nødvendigt

### Port 3000 optaget
- Stop eksisterende server eller brug anden port:
  ```bash
  npm run dev -- -p 3001
  ```

### CUDA out of memory
- Reducer batch size eller brug CPU:
  - Script bruger automatisk CPU hvis CUDA ikke er tilgængelig

## System Krav

- **Minimum:** 4GB RAM, CPU
- **Anbefalet:** 8GB RAM, NVIDIA GPU med CUDA support
- **Disk Space:** ~2GB (inkl. checkpoints)

