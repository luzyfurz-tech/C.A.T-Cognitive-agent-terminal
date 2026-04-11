# Ollama Agent Protocol v2.0

Dette projekt er en avanceret AI-agent platform bygget med React, Express og Ollama. Den indeholder specialiserede agenter til kodning, sikkerhed og web-research.

## Forudsætninger

Før du starter, skal du have følgende installeret på din maskine:

1.  **Node.js** (v18 eller nyere)
2.  **Ollama** (Download fra [ollama.com](https://ollama.com))
3.  **Docker** (Valgfrit, men påkrævet for Docker-funktioner i Coding-sektionen)
4.  **Git** (Valgfrit)

## Installation

1.  **Udpak projektet**: Udpak .zip filen til en mappe på din pc (f.eks. `C:\OllamaAgent`).
2.  **Åbn en terminal**: Åbn PowerShell eller CMD i projektmappen.
3.  **Installer afhængigheder**:
    ```bash
    npm install
    ```

## Konfiguration

1.  **Start Ollama**: Sørg for at Ollama kører på din maskine.
2.  **Miljøvariabler**: Projektet bruger standardindstillinger, men du kan konfigurere dem i appen under "Settings".

## Start af applikationen

Du kan starte projektet i udviklingstilstand:

```bash
npm run dev
```

Appen vil være tilgængelig på: `http://localhost:3000` (eller `http://rasp.local:3000` på din Pi)

## Windows 11 Kompatibilitet

Agenterne er instrueret i at genkende operativsystemet. Hvis du kører på Windows, vil de automatisk forsøge at bruge Windows-kompatible kommandoer (PowerShell/CMD) i stedet for Linux-specifikke kommandoer (som `ls -la` vs `dir`).

### Tips til Windows-brugere:
- **Docker & WSL 2**: Det anbefales kraftigt at aktivere **WSL 2** under Docker-installationen (som vist i din konfiguration). Det giver langt bedre ydeevne og kompatibilitet med de Linux-containere, som agenterne typisk bygger.
- **Windows Containers**: Du behøver normalt ikke "Allow Windows Containers" til dette projekt, da vi bruger standard Linux-baserede images (Nginx, Python osv.).
- **Port 80**: Du kan køre appen på port 80 ved at sætte en miljøvariabel før start:
  - I PowerShell: `$env:PORT=80; npm run dev`
  - I CMD: `set PORT=80 && npm run dev`
  - *Bemærk*: Port 80 kræver ofte administrator-rettigheder, og du skal sikre dig, at andre programmer (som f.eks. IIS) ikke allerede bruger porten.
- **Rettigheder**: Kør terminalen som administrator, hvis agenterne har problemer med at oprette mapper eller filer i visse områder.
- **Stier**: Agenterne bruger relative stier i `web_design_workspace/` for at undgå problemer med Windows-stiformater.

## Raspberry Pi / Linux Deployment

Dette projekt er optimeret til at køre på en Raspberry Pi (f.eks. Pi 4 eller 5) med Linux (Raspberry Pi OS).

### Auto-Start (systemd)

For at sikre at C.A.T starter automatisk når din Pi tænder, kan du bruge den indbyggede setup-kommando.

1.  **Kopier projektet** til din Pi (f.eks. til `/home/pi/cat`).
2.  **Installer afhængigheder**:
    ```bash
    npm install
    ```
3.  **Kør setup**:
    ```bash
    sudo npm run setup-pi
    ```
    *Dette script vil spørge dig hvilken port du vil bruge, og derefter automatisk konfigurere og starte servicen.*

### Hvordan man deaktiverer auto-start

Hvis du ønsker at stoppe eller fjerne auto-start funktionen:

- **Stop servicen midlertidigt**:
  ```bash
  sudo systemctl stop cat.service
  ```
- **Deaktiver auto-start ved boot**:
  ```bash
  sudo systemctl disable cat.service
  ```
- **Fjern servicen helt**:
  ```bash
  sudo systemctl stop cat.service
  sudo systemctl disable cat.service
  sudo rm /etc/systemd/system/cat.service
  sudo systemctl daemon-reload
  ```

## Agenter

- **Coding Agent**: Specialiseret i webudvikling og automatisering.
- **Aegis (Security)**: Specialiseret i sikkerhedsanalyse og monitorering.
- **OpenClaw**: Specialiseret i web-research og browsing (bruger Playwright).
