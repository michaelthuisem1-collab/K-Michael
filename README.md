# Tangkhul Village Directory — Progressive Web App (PWA)

A Progressive Web App (PWA) for managing and preserving personal, regional, and administrative records for the Tangkhul community. Built around the official Tangkhul Village Directory, preloaded with all 233 villages across the 4 traditional regional Longphangs:
- **North — Ato** (47 villages)
- **East — Zingsho** (65 villages)
- **West — Zingtun** (34 villages)
- **South — Aze** (87 villages)

---

## Key Features

1. **Complete Initial Dataset (233 Villages)**
   - Faithfully transcribed directly from the official directory document.
   - Original spellings, regional boundaries, and exact recorded vote counts preserved.
   - Blank / unverified votes are kept strictly as unrecorded/null (never mistakenly converted to zero).

2. **Offline-First Persistence via IndexedDB**
   - All records are saved in the browser's structured `TangkhulVillageDirectoryDB`.
   - Data persists across page reloads, browser restarts, device reboots, and network disconnects.
   - Fully functional offline without requiring any external server connection.

3. **Interactive Village Management**
   - **Search & Filter:** Instant multi-field search across Village Name, Region, Longphang, President, Contact No., and Misc. Notes.
   - **Filter Options:** Filter by individual Region (North, East, West, South) and Data Completeness (Missing Votes, Missing President, Missing Contact, Any Missing, Fully Complete).
   - **Sorting:** Sort by Serial Number (Sl. No.), Village Name (A–Z), Region, Vote Count, or Last Updated.
   - **Dual Views:** Switch seamlessly between a multi-column **Table View** and a touch-optimized **Card Grid View**.
   - **Pagination:** Configurable page sizes (15, 25, 50, 100, or All).

4. **Add, Edit, and Delete with Safety Safeguards**
   - Modal forms for creating new villages and editing existing records.
   - Intelligent duplicate detection warning when similar village names are entered (without preventing legitimate entries).
   - Confirmation dialog before deleting any record to prevent accidental data loss.
   - Real-time timestamp updates on every save.

5. **Live Dashboard & Statistical Analytics**
   - Summary cards displaying Total Villages, Total Recorded Votes, Missing Information Count, and Fully Populated Count.
   - Region breakdown cards with vote aggregates and percentage distribution.
   - Native charts for **Villages by Region** and **Recorded Votes by Region**.
   - Field Completeness meter (% of villages with recorded votes, president names, and phone numbers).
   - Recently Updated Records tracker with 1-click edit triggers.

6. **Comprehensive Data Import & Export**
   - **CSV Export:** UTF-8 BOM encoded, Excel & Google Sheets compatible.
   - **JSON Backup:** Full database snapshot with versioning, exported timestamp, and schema verification.
   - **CSV Import:** Upload spreadsheets with duplicate conflict handling (Skip duplicates vs. Update existing).
   - **JSON Restore:** Restore backups in Safe Merge or Complete Replace mode.
   - **Reset to Official Data:** Re-seed the initial 233 villages if needed.

7. **PWA Compliance & Offline Readiness**
   - Installable on Android (Chrome/Firefox/Edge) and iOS (Safari "Add to Home Screen").
   - Standalone display mode with custom theme color (`#1e40af`) and splash screens.
   - Integrated `PWAInstallButton` with platform-specific guidance.
   - Non-intrusive offline status banner and backup reminders when changes are unbacked.

8. **Privacy & Data Security**
   - Operates 100% locally on the user's device.
   - Zero telemetry, third-party analytics, or tracking scripts.
   - Contact numbers and administrative notes are never transmitted to external servers.

---

## Technical Stack

- **Framework:** React 19 + TypeScript
- **Bundler & Build Tool:** Vite 8 with `@tailwindcss/vite`
- **PWA Tooling:** `vite-plugin-pwa` with Workbox caching
- **Storage Layer:** Native HTML5 IndexedDB API
- **Icons:** Lucide React

---

## How to Run & Build

### Development Mode
```bash
npm install
npm run dev
```
The app will be available on `http://localhost:3000`.

### Production Build
```bash
npm run build
```
Builds production-ready static assets and service worker manifests to the `dist/` folder.

### Run Code Check / Lint
```bash
npm run lint
```

---

## Deployment Instructions

### HTTPS Requirement for PWA Installation
PWAs require a secure context (`https://`) or `localhost` to register service workers and trigger the native install prompt.

- **Vercel / Netlify / Cloudflare Pages:** Connect repository and set build command to `npm run build` and output directory to `dist`.
- **Google Cloud Run:** Deploy the containerized application or serve via Nginx / Node.js static server on port 3000.

---

## Android & iOS Installation Guide

- **Android (Chrome):** Open the application URL. Tap the **Install PWA** button in the header, or open the browser menu (⋮) and tap **Install app** / **Add to Home screen**.
- **iOS Safari (iPhone/iPad):** Open the application in Safari. Tap the **Share** button in the bottom navigation bar, scroll down, and select **Add to Home Screen**.

---

## Directory Structure Overview

```
├── public/
│   ├── icon.svg                     # High-resolution brand vector icon
│   ├── pwa-192x192.png              # Android standard icon
│   ├── pwa-512x512.png              # Android high-res icon
│   ├── pwa-maskable-512x512.png     # Android adaptive icon (with safe-zone padding)
│   ├── apple-touch-icon.png         # iOS Safari home screen icon
│   └── favicon.ico                  # Browser tab icon
├── src/
│   ├── components/
│   │   ├── BackupReminderBanner.tsx # Unbacked modifications alert
│   │   ├── Navbar.tsx               # Header with live persistence indicator & menu
│   │   ├── OfflineIndicator.tsx     # Toast shown when network is offline
│   │   ├── PWAInstallButton.tsx     # In-app install trigger with iOS instructions
│   │   └── Sidebar.tsx              # Desktop sidebar & mobile drawer navigation
│   ├── data/
│   │   └── initialVillages.ts       # 233 Tangkhul village records transcribed from source
│   ├── hooks/
│   │   ├── useOnlineStatus.ts       # Network connectivity listener
│   │   └── usePWAInstall.ts         # BeforeInstallPrompt handler
│   ├── pages/
│   │   ├── AddEditVillageModal.tsx  # Create/edit village record modal
│   │   ├── Dashboard.tsx            # Live summary cards, region charts & recent updates
│   │   ├── Directory.tsx            # Searchable directory table, filters & card view
│   │   ├── ImportExport.tsx         # CSV / JSON export, import & backup restore
│   │   └── Settings.tsx             # Preferences, storage inspector, privacy notice
│   ├── services/
│   │   └── db.ts                    # IndexedDB persistence layer and backup helpers
│   ├── types/
│   │   └── village.ts               # VillageRecord and filtering TypeScript types
│   ├── App.tsx                      # Root application component and state orchestration
│   ├── index.css                    # Tailwind CSS configuration
│   └── main.tsx                     # React entrypoint
├── index.html                       # HTML head with PWA manifest and mobile tags
├── metadata.json                    # Project description and capability metadata
├── tsconfig.json                    # TypeScript compiler options
└── vite.config.ts                   # Vite + VitePWA configuration
```
