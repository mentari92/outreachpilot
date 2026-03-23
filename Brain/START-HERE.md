# START HERE — OutreachPilot Chrome Extension
## Vibe Coding Guide for Antigravity / Trae / Cursor
## Version 1.0 — AI-Powered Outreach Co-Pilot for Link Building Teams

---

## Step 1: Folder Structure

Upload all files from the Brain/ folder into your IDE:

```
outreach-pilot/
├── Brain/
│   ├── START-HERE.md             ← This file — read first
│   ├── 01-project-brief.md       ← What we're building & why
│   ├── 02-prd.md                 ← All features & acceptance criteria
│   ├── 03-architecture.md        ← Tech stack, data flow, file structure
│   └── 04-epics-and-stories.md   ← Build order & story checklist (all 6 epics)
├── src/
│   ├── manifest.json             ← Extension config (MV3, CSP, host_permissions)
│   ├── popup.html                ← Side panel UI
│   ├── popup.js                  ← Core logic: scan, email tabs, autonomous mode
│   ├── popup.css                 ← Styles (Canva brand colors)
│   ├── content.js                ← Injected scraper & contact extractor
│   ├── background.js             ← Service worker: LLM calls, autonomous agent, CORS fetches
│   ├── settings.html             ← Settings page UI
│   └── settings.js               ← Settings logic: save/load API keys & preferences
└── (icons)
```

---

## Step 2: Build Order & Status

### Epic 1: Foundation ✅ COMPLETE
- [x] **Story 1.1** — Project setup & manifest.json
- [x] **Story 1.2** — Settings page (API keys & user preferences)

### Epic 2: Core Scanning ✅ COMPLETE
- [x] **Story 2.1** — content.js: website scraper & contact extractor
- [x] **Story 2.2** — background.js: LLM integration & auto-fallback (10 providers via callWithFallback)
- [x] **Story 2.3** — PBN detection & QA scoring

### Epic 3: Email Generation & UI ✅ COMPLETE
- [x] **Story 3.1** — Popup UI (Manual Mode, side panel)
- [x] **Story 3.2** — Personalized email generator (multi-language)

### Epic 4: Autonomous Mode (AI Agent) ✅ COMPLETE
- [x] **Story 4.1** — Autonomous Mode UI & URL list input
- [x] **Story 4.2** — Autonomous Mode agent loop logic + CSV export

### Epic 5: Data Export ✅ COMPLETE
- [x] **Story 5.1** — CSV Export (Email_1 / Email_2 / Email_3 columns)

### Epic 6: Hardening & Quality ✅ COMPLETE
- [x] **Story 6.1** — 11 Functionality Gaps fixed (URL validation, CORS, WhatsApp E.164, Hunter.io, 3-email sequence, checkpoint/resume, rate limiting, mailto links, targetUrl)
- [x] **Story 6.2** — Security Gaps fixed (storage.local, API key masking, CSP, DOM sanitization, Canva brand voice)
- [x] **Story 6.3** — Code Audit: 3 bugs fixed in background.js
- [x] **Story 6.4** — Post-launch bug fix: Straico Fetch Models endpoint corrected (`/v1/model` → `/v0/models`)
- [x] **Story 6.5** — Second code audit: Stop button (popup.js), Groq provider (all 3 files), auto-fallback on 429 (callWithFallback), Google Sheets ID field removed

---

## Step 3: First Prompt (Fresh Start)

Paste this into your AI agent to begin:

```
Read all docs in the /Brain folder, especially 
03-architecture.md and 04-epics-and-stories.md.

Implement Story 1.1 – Project Setup & Manifest:
- Create all 8 files with correct structure:
  manifest.json, popup.html, popup.js, popup.css,
  content.js, background.js, settings.html, settings.js
- Write complete manifest.json (Manifest V3)
- Required permissions: storage, tabs, activeTab, scripting
- host_permissions: <all_urls>
- Register background.js as service worker
- Register content.js as content script on all URLs
- popup.html as browser action popup

The extension must load in Chrome via Load Unpacked without errors.
Clicking the icon must open an empty popup without crashing.

Tech stack: Vanilla HTML/CSS/JavaScript only. No frameworks.
Reference 03-architecture.md Section 10 for the exact manifest.json structure.
```

---

## Step 4: Prompt Template Per Story

Use this format for every story:

```
Read Brain/03-architecture.md and Brain/04-epics-and-stories.md.

Implement [STORY NUMBER] – [STORY NAME]:

[paste the acceptance criteria from 04-epics-and-stories.md]

Rules:
- Follow the file structure in 03-architecture.md Section 2
- Vanilla HTML/CSS/JavaScript only — no frameworks
- All API calls go through background.js (never call APIs from popup.js)
- All settings read/write via chrome.storage.local (NOT sync — API keys must not leave the device)
- All LLM prompts follow the structure in 03-architecture.md Section 6
- Handle errors gracefully — never crash the extension
```

---

## Step 5: How to Load Extension in Chrome

No publishing or approval needed. Just:

1. Open Chrome → go to `chrome://extensions`
2. Enable **Developer Mode** (top right toggle)
3. Click **"Load unpacked"**
4. Select the `outreach-pilot/` project folder
5. Extension appears in Chrome toolbar ✅

**To reload after code changes:**
- Go to `chrome://extensions`
- Click the refresh icon on OutreachPilot
- Or press `Ctrl+R` / `Cmd+R` on the extensions page

---

## Step 6: Environment Variables & API Keys

Create a `.env` file from `.env.example` and fill in your keys.

You don't need ALL keys — just one working LLM key to start.
The extension auto-falls back to the next available provider.

**Minimum to start testing Story 2.2:**
```
GEMINI_API_KEY=AIza...
```

> Note: API keys in Chrome Extension are stored in chrome.storage.local
> (entered via Settings page), not in .env files.
> Keys are masked in the settings UI — they never appear as plain text in the DOM.
> The .env.example is for reference only.
> Google Sheets integration was descoped — results are exported via CSV download instead.

---

## Step 7: Testing Each Story

After each story, verify acceptance criteria from 04-epics-and-stories.md before moving on.

Quick test checklist:
- [ ] Extension loads without errors in chrome://extensions
- [ ] No red errors in Chrome DevTools console (right-click popup → Inspect)
- [ ] Core feature of the story works end-to-end on a real website
- [ ] Extension does not crash on websites that block scripts

---

## Quick Reference

| File | Purpose |
|---|---|
| `01-project-brief.md` | What we're building, target users, success metrics |
| `02-prd.md` | All functional requirements, user stories, acceptance criteria |
| `03-architecture.md` | File structure, data flow, API endpoints, UI specs, manifest config |
| `04-epics-and-stories.md` | Build order, story details, acceptance criteria checklist |

---

## Tips for Vibe Coding

- Use **Plan mode** for complex stories: 2.2, 4.2, 5.1
- Use **Fast mode** for straightforward stories: 1.1, 1.2, 2.1, 3.1, 4.1
- After each story → test in Chrome before moving to the next
- If agent makes decisions not aligned with architecture → point it to the relevant section in 03-architecture.md
- Keep Chrome DevTools open (right-click extension popup → Inspect) to catch errors early
- Autonomous Mode requires `tabs` permission — make sure it's in manifest.json before Story 4.2
