# Architecture: OutreachPilot Chrome Extension

**Version:** 1.1
**Status:** Built — v1.1 Live

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
  - `wa.me/` links + Indonesian phone number patterns → WhatsApp numbers
  - Social media profile links: Instagram, LinkedIn, Twitter/X, Facebook, TikTok
- Detecting "Write for Us" / "Guest Post" pages to flag link farms
- **Deep scanning** (`scrapePageWithDeepScan`): also fetches /contact, /about, /legal sub-pages for additional emails and WhatsApp; deduplicates all results
- Responds to "scrape" message from popup.js

### background.js (Service Worker)
Responsible for all external API calls and autonomous orchestration:
- **9 LLM Provider classes:** BaseProvider, GeminiProvider, OpenAIProvider, ClaudeProvider, GrokProvider, DeepSeekProvider, OpenRouterProvider, HuggingFaceProvider, StraicoProvider
- Each provider implements: `callAPI()`, `analyzeWebsite()`, `generateEmail()`
- **LLMFactory:** Instantiates the correct provider based on model choice
- Handles auto-fallback logic if quota exceeded (429)
- Returns structured JSON response including `modelUsed` field
- **AutonomousService class:** Manages bulk URL processing
  - Opens background tabs (20-second load timeout)
  - Waits 1 second post-load before scraping
  - Generates email if score ≥ 60
  - Exposes status (progress message, results array) for popup to poll
  - Supports pause/stop control
- Message listener handles: `analyze`, `generateEmail`, `startAutonomous`, `stopAutonomous`, `getAutonomousStatus`
- Sets up side panel to open on extension icon click

### popup.js
Core orchestration logic with 3 main classes:
- **StorageManager:** Reads/writes chrome.storage.sync; retrieves active API key and model name
- **UIBuilder:** Renders all UI states (loading, PBN, low score, pass, email, error)
- **PopupController:**
  - Triggers manual scan on popup open (sends "scrape" to content.js → "analyze" to background.js)
  - Handles tab switching (Manual ↔ Autonomous)
  - Detects tab/page changes and auto-rescans
  - Polls autonomous agent status every 1 second (sends "getAutonomousStatus")
  - CSV download for autonomous results (properly escaped for Excel)

### settings.js
- Reads and writes all settings to `chrome.storage.sync`
- **9 provider API keys** + per-provider Model ID
- Async "Fetch Models" functions for each provider (calls provider's model list API)
- Fields: defaultModel, apiKeys, models (per provider), userName, userSignature, emailLanguage, sheetsId

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
User pastes URL list → clicks "Run Agent"
          ↓
popup.js sends "startAutonomous" to background.js (AutonomousService)
          ↓
AutonomousService loop (runs in background):
  FOR each URL in list:
    1. chrome.tabs.create({ url, active: false })
    2. Wait for tab to load (20-second timeout)
    3. Wait 1 second after load
    4. chrome.tabs.sendMessage → content.js deep-scrapes tab
    5. LLM runs PBN + QA analysis
    6. If score ≥ 60 → generate email
    7. Update internal status (results array, progress message)
    8. Close background tab, move to next URL
          ↓
popup.js polls "getAutonomousStatus" every 1 second
  → renders live progress in popup UI
          ↓
Agent completes → final summary + "Download Results (CSV)" button
User can Pause or Stop at any point via "stopAutonomous" message
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

### Email Generation Prompt
```
You are an expert outreach email writer for link building.

Website info:
- Site Name: {title}
- Niche/Topic: {summary}
- Contact Name: {contactName or "there"}
- Sender Name: {userName}
- Sender Signature: {userSignature}
- Output Language: {emailLanguage or "English"}

Write a short, personalized cold outreach email for a link building request.
Requirements:
- Write the ENTIRE email in {emailLanguage}
- Subject line included
- Max 150 words
- Reference something specific about their site
- Natural, conversational tone
- No generic "I came across your website" openings
- End with a clear but soft call to action

Format:
Subject: [subject line]

[email body]
```

---

## 7. Google Sheets Log Structure

Columns logged per scan (in order):

| # | Column Name | Data |
|---|---|---|
| A | Date & Time | ISO timestamp |
| B | URL | Full URL scanned |
| C | PBN Detected | TRUE / FALSE |
| D | Overall QA Score | 0–100 |
| E | Content Quality | 0–100 |
| F | Niche Relevance | 0–100 |
| G | Site Trust | 0–100 |
| H | Email Found | email or empty |
| I | WhatsApp Found | number or empty |
| J | Social Media | comma-separated profiles |
| K | Email Draft | full email text or empty |
| L | Model Used | e.g. "gemini-2.0-flash" |

---

## 8. Chrome Storage Schema

```javascript
// chrome.storage.sync keys
{
  "defaultModel": "gemini" | "claude" | "openai" | "groq" | "openrouter" | "grok" | "deepseek" | "huggingface" | "straico",
  "apiKeys": {
    "gemini": "AIza...",
    "claude": "sk-ant-...",
    "openai": "sk-...",
    "groq": "gsk_...",
    "openrouter": "sk-or-...",
    "grok": "xai-...",
    "deepseek": "sk-...",
    "huggingface": "hf_...",
    "straico": "..."
  },
  "models": {
    "gemini": "gemini-2.0-flash",
    "claude": "claude-sonnet-4-20250514",
    "openai": "gpt-4o",
    "groq": "llama-3.3-70b-versatile",
    "openrouter": "openai/gpt-4o",
    "grok": "grok-beta",
    "deepseek": "deepseek-chat",
    "huggingface": "mistralai/Mistral-7B-Instruct-v0.2",
    "straico": "openai/gpt-4o"
  },
  "userName": "Mentari",
  "userSignature": "Best regards,\nMentari\nCanva Link Building",
  "emailLanguage": "English",
  "sheetsId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
}
```

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
  "version": "1.0.0",
  "description": "AI-powered outreach co-pilot for link building teams",
  "permissions": ["storage", "tabs", "activeTab", "scripting", "sidePanel"],
  "host_permissions": ["<all_urls>"],
  "side_panel": {
    "default_path": "popup.html"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }],
  "icons": {
    "16": "icon16.png",
    "32": "icon32.png",
    "48": "icon48.png",
    "128": "icon128.png"
  }
}
```

> **Note:** The extension uses `side_panel` instead of `action.default_popup`. The side panel opens when the user clicks the extension icon, set up via `chrome.sidePanel.setPanelBehavior` in background.js.
