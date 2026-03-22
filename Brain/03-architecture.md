# Architecture: OutreachPilot Chrome Extension

**Version:** 1.3
**Status:** Built — v1.3 Live (Security Hardened + BMAD Audited)

---

## 1. Overview

OutreachPilot is a **client-side only** Chrome Extension. There is no backend server, no database, and no deployment required. All logic runs inside the browser using Chrome Extension APIs.

**No backend. No server. No deployment.**

---

## 2. File Structure

```
outreach-pilot/
├── manifest.json           → Extension config, permissions, service worker declaration
├── popup.html              → Main UI rendered when extension icon is clicked
├── popup.js                → Core logic: scan trigger, UI updates, mode switching
├── popup.css               → Styles for popup (400px wide, sidebar style)
├── content.js              → Injected into pages: scrapes content & contact info
├── background.js           → Service worker: handles all LLM API calls, avoids CORS
└── settings.html           → Settings page UI
└── settings.js             → Settings logic: save/load API keys & preferences
```

---

## 3. Component Responsibilities

### manifest.json
- Declares extension name, version, permissions
- Registers background.js as service worker
- Registers content.js as content script (runs on all URLs)
- Uses `side_panel` (not `action`) — extension opens as a side panel on icon click
- Required permissions: `storage`, `tabs`, `activeTab`, `scripting`, `sidePanel`

### content.js
Injected into every webpage. Responsible for:
- Extracting page title, meta description, first 2000 chars of body text
- Counting total outbound links
- Detecting author info presence (meta tags, semantic HTML, byline patterns, multilingual patterns)
- Finding contact info:
  - `mailto:` links + visible text + obfuscated formats (e.g. "name [at] domain") → email addresses
  - `wa.me/` links + Indonesian phone patterns + **E.164 international regex** (`/\+[1-9]\d{6,14}/g`) → WhatsApp numbers
  - Social media profile links: Instagram, LinkedIn, Twitter/X, Facebook, TikTok
- Detecting "Write for Us" / "Guest Post" pages to flag link farms
- **Deep scanning** (`scrapePageWithDeepScan`): discovers /contact, /about, /legal links from the page, then **delegates fetching to background.js** via `fetchContactPages` message (CORS-safe); deduplicates all results
- Responds to "scrape" message from popup.js

### background.js (Service Worker)
Responsible for all external API calls and autonomous orchestration:
- **10 LLM Provider classes:** BaseProvider, GeminiProvider, OpenAIProvider, ClaudeProvider, GrokProvider, **GroqProvider**, DeepSeekProvider, OpenRouterProvider, HuggingFaceProvider, StraicoProvider
- Each provider implements: `callAPI()`, `analyzeWebsite()`, `generateEmail()`, **`generateEmailSequence()`**
- `BaseProvider.getEmailPrompt()` and `getEmailSequencePrompt()` embed **Canva Brand Voice** directives (HUMAN / INSPIRING / EMPOWERING pillars, hard rules)
- `BaseProvider.parseEmailSequence()` splits LLM output on `=== EMAIL N ===` markers using positional indexing (`parts[1]`, `parts[2]`, `parts[3]`) — immune to LLM preamble text
- **LLMFactory:** Instantiates the correct provider based on model choice
- **`callWithFallback(action, data, settings)`:** Auto-fallback helper — tries providers in order (`gemini → claude → openai → groq → openrouter → grok → deepseek → huggingface → straico`), skips providers with no key or 429/quota/rate errors, returns first success with `modelUsed` field set
- Returns structured JSON response including `modelUsed` field
- **HunterService class:** Falls back to Hunter.io Domain Search API when no email found on page
- **AutonomousService class:** Manages bulk URL processing
  - Opens background tabs (20-second load timeout)
  - Configurable delay between URLs (`batchDelayMs`, default 2000ms)
  - Checkpoints progress to `chrome.storage.local` after every URL (`autonomousCheckpoint`)
  - Resumes from checkpoint if same URL batch is re-submitted
  - Hunter.io email fallback if page scrape returns no emails
  - Generates **3-email sequence** if score ≥ 60
  - Supports pause/stop control
- Message listener handles: `analyze`, `generateEmail`, `startAutonomous`, `resumeAutonomous`, `stopAutonomous`, `getAutonomousStatus`, **`fetchContactPages`**, **`checkCheckpoint`**
- All settings read from `chrome.storage.local` (not sync)
- Sets up side panel to open on extension icon click

### popup.js
Core orchestration logic with 3 main classes:
- **StorageManager:** Reads/writes `chrome.storage.local`; retrieves active API key and model name
- **UIBuilder:** Renders all UI states (loading, PBN, low score, pass, email tabs, error)
- **PopupController:**
  - **URL validation** on agent start: filters invalid URLs via `new URL()`, deduplicates via `Set`
  - Checks for existing checkpoint on init → shows "Resume from URL X/Y" button if found
  - Triggers manual scan on popup open (sends "scrape" to content.js → "analyze" to background.js)
  - Handles tab switching (Manual ↔ Autonomous)
  - Detects tab/page changes and auto-rescans
  - Polls autonomous agent status every 1 second (sends "getAutonomousStatus")
  - **3-email tab UI:** renders Email 1 / Email 2 / Email 3 tabs with copy button per email
  - **mailto: links** on discovered emails with individual clipboard copy buttons
  - CSV download for autonomous results

### settings.js
- Reads and writes all settings to **`chrome.storage.local`** (migrates from sync on first load)
- On load: **API key fields are left blank** with placeholder "(saved — leave blank to keep)" — actual key values never rendered to DOM
- On save: **merges** typed values with existing stored keys — blank fields keep existing values
- **DOM sanitized**: model names from API are inserted via `createElement` + `opt.value`, never `innerHTML`
- **10 provider API keys** + per-provider Model ID: gemini, openai, claude, grok, groq, openrouter, deepseek, huggingface, straico, hunterio
- Async "Fetch Models" functions for each provider — endpoints:
  - Gemini: `GET https://generativelanguage.googleapis.com/v1beta/models?key={key}`
  - OpenAI: `GET https://api.openai.com/v1/models`
  - Claude: `GET https://api.anthropic.com/v1/models`
  - Grok: `GET https://api.x.ai/v1/models`
  - OpenRouter: `GET https://openrouter.ai/api/v1/models`
  - DeepSeek: `GET https://api.deepseek.com/models`
  - Straico: `GET https://api.straico.com/v0/models` — response `data` can be array **or** `{chat:[…], image:[…]}` object; both formats handled via `Object.values().flat()`
  - Hugging Face: no Fetch Models (user enters model name manually)
- Fields: defaultModel, apiKeys, models (per provider), userName, userSignature, emailLanguage, **targetUrl**, **targetDescription**, **batchDelayMs**

---

## 4. Data Flow

### 4.1 Manual Mode Flow

```
User opens popup on prospect website
          ↓
popup.js → chrome.tabs.sendMessage → content.js
          ↓
content.js scrapes:
  - title, meta, body text
  - outbound link count
  - author info
  - emails, WhatsApp, social profiles
          ↓
content.js → chrome.runtime.sendMessage → popup.js
          ↓
popup.js → chrome.runtime.sendMessage → background.js
          ↓
background.js calls LLM API with scraped data
          ↓
LLM returns structured JSON:
  {
    isPBN: boolean,
    pbnReasons: string[],
    contentQuality: number,
    nicheRelevance: number,
    siteTrust: number,
    overallScore: number,
    summary: string
  }
          ↓
background.js → popup.js → renders result in popup.html
          ↓
If score ≥ 60 → "Generate Email" button appears
User clicks → background.js calls LLM → email rendered
          ↓
User clicks "Save to Sheets" → background.js calls Sheets API
```

### 4.2 Autonomous Mode Flow

```
User pastes URL list → popup validates (new URL() + Set dedup) → clicks "Run Agent"
          ↓
popup.js sends "startAutonomous" { urls, settings } to background.js
          ↓
AutonomousService loop (runs in background):
  IF resumeFromCheckpoint AND same URL batch → restore progress from chrome.storage.local
  FOR each URL in list (starting from checkpoint index):
    1. chrome.tabs.create({ url, active: false })
    2. Wait for tab to load (20-second timeout)
    3. Wait 1 second after load
    4. chrome.tabs.sendMessage → content.js deep-scrapes tab
       (contact pages fetched via background to avoid CORS)
    5. LLM runs PBN + QA analysis
    6. If score ≥ 60:
       a. Generate 3-email sequence (Day 0 / Day 5-7 / Day 12-14)
       b. If no email found → Hunter.io fallback
    7. Save checkpoint: { urls, currentIdx, results, uiResults } to chrome.storage.local
    8. Wait batchDelayMs (default 2000ms) before next URL
    9. Close background tab, move to next URL
          ↓
popup.js polls "getAutonomousStatus" every 1 second
  → renders live progress in popup UI
          ↓
Agent completes → final summary + "Download Results (CSV)" button
User can Stop at any point via "stopAutonomous" message
User can Resume via "Resume from URL X/Y" button (reads checkpoint)
```

### 4.3 LLM Auto-Fallback Flow

```
background.js calls Default Model API
  ├── Success (200) → return result
  └── Quota exceeded (429) → try next provider

Fallback order (based on available keys):
  Gemini → Claude → OpenAI → Groq → OpenRouter → Grok → DeepSeek → Hugging Face → Straico

If all fail → return error to popup.js → show error message
Always show active model name in popup UI
```

---

## 5. LLM API Endpoints

| Provider | Default Model | Endpoint |
|---|---|---|
| Gemini | gemini-2.0-flash | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` |
| Claude | claude-sonnet-4-20250514 | `https://api.anthropic.com/v1/messages` |
| OpenAI | gpt-4o | `https://api.openai.com/v1/chat/completions` |
| Groq | llama-3.3-70b-versatile | `https://api.groq.com/openai/v1/chat/completions` |
| OpenRouter | (user selected) | `https://openrouter.ai/api/v1/chat/completions` |
| Grok (xAI) | grok-beta | `https://api.x.ai/v1/chat/completions` |
| DeepSeek | deepseek-chat | `https://api.deepseek.com/v1/chat/completions` |
| Hugging Face | (user selected) | `https://api-inference.huggingface.co/models/{model}` |
| Straico | (user selected) | `https://api.straico.com/v0/prompt/completion` |

> All model IDs are configurable per-provider via the Settings page.

---

## 6. LLM Prompt Structure

### QA Analysis Prompt
```
You are an expert link building analyst. Analyze the following website content 
and return a JSON response only.

Website data:
- Title: {title}
- Meta Description: {metaDescription}
- Body Text (first 2000 chars): {bodyText}
- Outbound Links Count: {outboundLinks}
- Has Author Info: {hasAuthor}

Return this exact JSON structure:
{
  "isPBN": boolean,
  "pbnReasons": ["reason1", "reason2"],
  "contentQuality": number (0-100),
  "nicheRelevance": number (0-100),
  "siteTrust": number (0-100),
  "overallScore": number (0-100, average of the three),
  "summary": "1-2 sentence summary of the site"
}

PBN red flags to check: thin content, excessive outbound links (>50),
no author info, generic template design, unrelated content mix.
Return ONLY valid JSON. No explanation.
```

### Email Generation Prompt (Single + 3-Email Sequence)
All email prompts embed **Canva Brand Voice** directives:

**3 Pillars (mandatory):**
- **HUMAN** — warm, simple, conversational; contractions always; max 15–20 words/sentence; speak to the individual by name (Hi / Hey, not Dear)
- **INSPIRING** — open with something specific about their site; motivate action; show don't tell; never "I am writing to inform you"
- **EMPOWERING** — prospect is the hero, not Canva; reference "Canva" by name + specific URL; never "our platform/service"; light no-pressure CTA

**Hard rules:** No Sincerely/Best regards, no bullet points, no jargon (leverage/synergy/solution), subject line under 10 words and benefit-focused.

**3-Email Sequence format:**
```
=== EMAIL 1 ===
Subject: [subject]

[Day 0 — Inspiring + warm: spark curiosity, make clear ask]

=== EMAIL 2 ===
Subject: [subject]

[Day 5–7 — Playful + brief: friendly nudge, new insight]

=== EMAIL 3 ===
Subject: [subject]

[Day 12–14 — Heartwarming: close gracefully, leave with a smile]
```

Context injected into prompt: `siteUrl`, `summary`, `userName`, `userSignature`, `language`, `targetUrl`, `targetDescription`

---

## 7. CSV Export Structure

Columns exported per scan (in order):

| # | Column Name | Data |
|---|---|---|
| A | Date | ISO timestamp |
| B | URL | Full URL scanned |
| C | PBN Detected | TRUE / FALSE |
| D | Overall Score | 0–100 |
| E | Content Quality | 0–100 |
| F | Niche Relevance | 0–100 |
| G | Trust Score | 0–100 |
| H | Emails | comma-separated emails found |
| I | WhatsApp | comma-separated numbers found |
| J | Social Profiles | comma-separated social links |
| K | Email_1 | Day 0 pitch email (full text) |
| L | Email_2 | Day 5–7 follow-up email |
| M | Email_3 | Day 12–14 final check-in |
| N | Model Used | e.g. "gemini-2.0-flash" |

---

## 8. Chrome Storage Schema

```javascript
// ALL settings stored in chrome.storage.local (NOT sync — keys never leave the device)

// Main settings object:
{
  "defaultModel": "gemini" | "claude" | "openai" | "grok" | "openrouter" | "deepseek" | "huggingface" | "straico",
  "apiKeys": {
    "gemini": "AIza...",
    "claude": "sk-ant-...",
    "openai": "sk-...",
    "grok": "xai-...",
    "openrouter": "sk-or-...",
    "deepseek": "sk-...",
    "huggingface": "hf_...",
    "straico": "...",
    "hunterio": "..."           // Hunter.io API key for email enrichment fallback
  },
  "models": {
    "gemini": "gemini-2.0-flash",
    "claude": "claude-sonnet-4-20250514",
    "openai": "gpt-4o",
    "grok": "grok-beta",
    "openrouter": "openai/gpt-4o",
    "deepseek": "deepseek-chat",
    "huggingface": "mistralai/Mistral-7B-Instruct-v0.2",
    "straico": "openai/gpt-4o"
  },
  "userName": "Mentari",
  "userSignature": "Cheers,\nMentari\nCanva Link Building",
  "emailLanguage": "",           // Free text — user fills in their preferred language; empty = English fallback
  "targetUrl": "",               // Canva URL to pitch (e.g. canva.com/templates)
  "targetDescription": "",       // Value proposition for the pitch
  "batchDelayMs": 2000           // Delay between URLs in autonomous mode (ms)
}

// Autonomous mode checkpoint (separate key, written after each URL):
{
  "autonomousCheckpoint": {
    "urls": ["https://...", "https://..."],   // full URL list (fingerprint for resume validation)
    "currentIdx": 3,                          // next URL to process
    "results": [...],                         // raw data for CSV
    "uiResults": [...],                       // rendered card data
    "savedAt": 1742000000000                  // timestamp
  }
}
```

> **Security note:** API keys are never displayed in the settings UI. Fields load blank with placeholder "(saved — leave blank to keep)". Saving with a blank field preserves the existing stored key.

---

## 9. UI Specifications

### Popup Dimensions
- Width: 400px
- Max Height: 580px (scrollable if content overflows)

### Color Palette (Canva Brand Colors)

| Role | Hex | Usage |
|---|---|---|
| Primary (Canva Turquoise) | `#00c4cc` | Buttons, active states, progress bar, links |
| Secondary (Canva Purple) | `#7d2ae8` | Gradient accents, header background, badges |
| Gradient | `linear-gradient(135deg, #00c4cc, #7d2ae8)` | Header bar, "Run Agent" button, score badge |
| Success | `#00c4cc` | Passed QA state (use Canva turquoise) |
| Warning | `#f59e0b` | Low score warning |
| Danger | `#ef4444` | PBN detected state |
| Background | `#ffffff` | Popup background |
| Surface | `#f8fafc` | Card/section backgrounds |
| Text Primary | `#1e293b` | Main text |
| Text Secondary | `#64748b` | Labels, sub-scores |
| Border | `#e2e8f0` | Dividers, input borders |

### Gradient Usage
The Canva gradient (`#00c4cc` → `#7d2ae8`) should be applied to:
- Extension popup header bar (with OutreachPilot logo/name)
- "Run Agent" button in Autonomous Mode
- Overall QA Score badge (when passed)
- Progress bar in Autonomous Mode
- Active tab indicator ([Manual] / [Autonomous] tabs)

### Key UI States
1. **Loading** — spinner, "Analyzing website..."
2. **PBN Detected** — red banner, reason list, no email button
3. **Low Score** — amber banner, score breakdown (Content Quality / Niche Relevance / Site Trust), no email button
4. **Passed** — green banner, score breakdown, contact info (emails, WhatsApp, social), "Generate Email" button
5. **Email Generated** — email text area, "Copy" button, toast confirmation
6. **Autonomous Running** — progress message "Processing X of Y", live result cards per URL
7. **Autonomous Complete** — final summary, "Download Results (CSV)" button
8. **Error** — error message, suggestion to switch model

---

## 10. Manifest V3 Configuration

```json
{
  "manifest_version": 3,
  "name": "OutreachPilot",
  "version": "1.3.0",
  "description": "AI-powered outreach co-pilot for link building teams",
  "permissions": ["storage", "tabs", "activeTab", "scripting", "sidePanel"],
  "host_permissions": ["https://*/*", "http://*/*"],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  "side_panel": {
    "default_path": "popup.html"
  },
  "options_page": "settings.html",
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["https://*/*", "http://*/*"],
    "js": ["content.js"]
  }],
  "icons": {
    "16": "icon16.png",
    "48": "icon48.png",
    "128": "icon128.png"
  }
}
```

> **Security notes:**
> - `host_permissions` uses explicit protocol patterns instead of `<all_urls>` — functionally equivalent but more auditable
> - `content_security_policy` locks extension pages to self-only scripts (no inline scripts, no eval)
> - Side panel opens on icon click via `chrome.sidePanel.setPanelBehavior` in background.js
