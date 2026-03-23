# Epics & Stories: OutreachPilot

**Version:** 1.3
**Build Period:** Feb 24 – Mar 22, 2026
**Status:** ✅ ALL EPICS COMPLETE — Extension v1.3 Built & Security Hardened

---

## Build Order Checklist

### Epic 1: Foundation ✅ COMPLETE
- [x] **Story 1.1** — Project setup & manifest.json
- [x] **Story 1.2** — Settings page (API keys & user preferences)

### Epic 2: Core Scanning ✅ COMPLETE
- [x] **Story 2.1** — content.js: website scraper & contact extractor
- [x] **Story 2.2** — background.js: LLM integration & auto-fallback
- [x] **Story 2.3** — PBN detection & QA scoring

### Epic 3: Email Generation & UI ✅ COMPLETE
- [x] **Story 3.1** — Popup UI (Manual Mode)
- [x] **Story 3.2** — Personalized email generator

### Epic 4: Autonomous Mode (AI Agent) ✅ COMPLETE
- [x] **Story 4.1** — Autonomous Mode UI & URL list input
- [x] **Story 4.2** — Autonomous Mode agent loop logic

### Epic 5: Data Export ✅ COMPLETE
- [x] **Story 5.1** — CSV Export (Download Results CSV button implemented)

### Epic 6: Hardening & Quality ✅ COMPLETE
- [x] **Story 6.1** — Functionality Gaps 1–11 (URL validation, rate limiting, CORS fix, WhatsApp E.164, mailto links, checkpoint/resume, Hunter.io, 3-email sequence, targetUrl/Description)
- [x] **Story 6.2** — Security Gaps (storage.local, API key masking, CSP, DOM sanitization, Canva brand voice)
- [x] **Story 6.3** — Code Audit: 3 bugs fixed (storage.sync bug, parseEmailSequence bug, HunterService error logging)

---

## Epic 1: Foundation

### Story 1.1 — Project Setup & Manifest

**Goal:** Create the complete file structure and a working manifest.json so the extension can be loaded in Chrome.

**Tasks:**
- Create all 8 files with correct structure (empty placeholders are fine)
- Write complete manifest.json with all required fields

**Acceptance Criteria:**
- [x] All files exist: manifest.json, popup.html, popup.js, popup.css, content.js, background.js, settings.html, settings.js
- [x] manifest.json is valid Manifest V3
- [x] Extension loads in Chrome via `chrome://extensions` → Load unpacked without errors
- [x] Clicking extension icon opens side panel (no crash)

---

### Story 1.2 — Settings Page

**Goal:** Build a functional settings page where users can input and save all API keys and preferences.

**Tasks:**
- Build settings.html UI with all input fields
- Implement settings.js to save/load from chrome.storage.local
- Add ⚙️ icon in popup that opens settings page

**Acceptance Criteria:**
- [x] Settings page has fields for: Default Model (dropdown), API keys + Model ID for 9 providers (Gemini, Claude, OpenAI, Grok, Groq, OpenRouter, DeepSeek, Hugging Face, Straico) + Hunter.io, Your Name, Email Signature, Output Language, Target URL, Value Proposition, Batch Delay
- [x] Each provider has a "Fetch Models" button to auto-load available models (except Hugging Face — manual entry)
- [x] Clicking "Save" stores all values in chrome.storage.local
- [x] Values persist after Chrome is restarted (stored in chrome.storage.local)
- [x] Reopening settings shows previously saved values
- [x] ⚙️ icon in popup opens settings page

---

## Epic 2: Core Scanning

### Story 2.1 — Website Scraper & Contact Extractor

**Goal:** content.js extracts all relevant data from any webpage.

**Tasks:**
- Extract page title, meta description, first 2000 chars of body text
- Count total outbound links (href starting with http)
- Detect presence of author info (look for common author selectors)
- Find all mailto: email addresses
- Find all wa.me/ WhatsApp numbers
- Find social media profile links: Instagram, LinkedIn, Twitter/X, Facebook, TikTok

**Acceptance Criteria:**
- [x] Returns title, metaDescription, bodyText (max 2000 chars), outboundLinkCount, hasAuthor
- [x] Returns emails array — includes obfuscated formats and deep-scanned sub-pages
- [x] Returns whatsapp array — includes wa.me links and Indonesian phone patterns
- [x] Returns socialProfiles object with keys: instagram, linkedin, twitter, facebook, tiktok
- [x] Deep-scans /contact, /about, /legal for additional contact info
- [x] Detects "Write for Us" / "Guest Post" pages
- [x] Works on at least 10 different editorial websites without crashing
- [x] Handles websites that block scripts gracefully (returns empty values, no crash)

---

### Story 2.2 — LLM Integration & Auto-Fallback

**Goal:** background.js handles all LLM API calls and automatically switches providers on quota errors.

**Tasks:**
- Implement API call functions for all 9 providers (Gemini, Claude, OpenAI, Groq, OpenRouter, Grok, DeepSeek, Hugging Face, Straico)
- Implement auto-fallback logic (try next provider on 429 error)
- Return active model name with every response
- Handle network errors gracefully

**Acceptance Criteria:**
- [x] Successfully calls Gemini API with a valid key
- [x] Successfully calls Claude API with a valid key
- [x] Successfully calls OpenAI API with a valid key
- [x] Successfully calls Groq API with a valid key
- [x] Successfully calls OpenRouter API with a valid key
- [x] Successfully calls Grok (xAI) API with a valid key
- [x] Successfully calls DeepSeek API with a valid key
- [x] Successfully calls Hugging Face API with a valid key
- [x] Successfully calls Straico API with a valid key
- [x] When primary model returns 429 → automatically tries next provider with a valid key
- [x] Response always includes `modelUsed` field
- [x] If all providers fail → returns error object with clear message

---

### Story 2.3 — PBN Detection & QA Scoring

**Goal:** LLM analyzes scraped data and returns structured PBN + QA result.

**Tasks:**
- Write QA analysis prompt (see architecture.md Section 6)
- Parse LLM response into structured JSON
- Implement scoring logic

**Acceptance Criteria:**
- [x] Returns isPBN (boolean), pbnReasons (array), contentQuality, nicheRelevance, siteTrust, overallScore, summary
- [x] Known PBN-style sites are correctly flagged as isPBN: true
- [x] Legitimate editorial sites score ≥ 60 and are flagged as isPBN: false
- [x] overallScore is the average of the 3 sub-scores
- [x] If LLM returns malformed JSON → retry once, then return error

---

## Epic 3: Email Generation & UI

### Story 3.1 — Popup UI (Manual Mode)

**Goal:** Build the complete popup interface for Manual Mode.

**Tasks:**
- Build popup.html structure with all states
- Style with popup.css (400px wide, clean minimal design)
- Implement popup.js to trigger scan on open and render results

**UI States to implement:**
1. Loading — spinner + "Analyzing website..."
2. PBN Detected — red banner + reasons + no email button
3. Low Score (< 60) — amber banner + score breakdown
4. Passed (≥ 60) — green banner + score breakdown + contact info + "Generate Email" button
5. Error — error message + model switch suggestion

**Acceptance Criteria:**
- [x] Side panel opens when user clicks extension icon
- [x] Scan starts automatically when side panel opens
- [x] All 5 UI states render correctly (Loading, PBN, Low Score, Passed, Error)
- [x] Score breakdown shows all 3 sub-scores (Content Quality, Niche Relevance, Site Trust)
- [x] Contact info section shows found emails, WhatsApp, social profiles
- [x] Active model name shown in top bar
- [x] ⚙️ icon opens settings page
- [x] Mode tabs [Manual] [Autonomous] visible at top
- [x] Auto-rescans when user switches tabs or refreshes page

---

### Story 3.2 — Personalized Email Generator

**Goal:** Generate a personalized outreach email and display it in the popup.

**Tasks:**
- Write email generation prompt (see architecture.md Section 6)
- Add email display section to popup.html
- Implement "Copy" button functionality

**Acceptance Criteria:**
- [x] "Generate Email" button only appears when QA score ≥ 60
- [x] Clicking button triggers LLM call and shows loading state
- [x] Generated email includes subject line and body
- [x] Email references something specific about the actual website
- [x] Email uses user's name and signature from settings
- [x] Email generated in the language configured in settings
- [x] "Copy" button copies the full email to clipboard
- [x] Confirmation toast shown after copy

---

## Epic 4: Autonomous Mode (AI Agent)

### Story 4.1 — Autonomous Mode UI & URL Input

**Goal:** Build the Autonomous Mode tab UI with URL list input and controls.

**Tasks:**
- Build Autonomous tab in popup.html
- Textarea for pasting URLs (one per line)
- "Run Agent" and "Stop" buttons
- Progress display: current URL number, total, status per URL

**Acceptance Criteria:**
- [x] Switching to Autonomous tab shows URL textarea
- [x] Textarea accepts multiple URLs (one per line)
- [x] "Run Agent" button triggers autonomous processing
- [x] Progress section shows: "Processing X of Y"
- [x] Each URL shows result card with status and score
- [x] Stop button halts the agent (via stopAutonomous message) — dynamically created in popup.js when agent starts
- [x] "Download Results (CSV)" button appears after completion

---

### Story 4.2 — Autonomous Mode Agent Loop

**Goal:** Implement the agent logic that processes URLs automatically.

**Tasks:**
- Open each URL in a background tab
- Wait for tab to fully load
- Trigger content.js scrape
- Run PBN + QA analysis
- Generate email if score ≥ 60
- Log to Google Sheets
- Close background tab
- Move to next URL

**Acceptance Criteria:**
- [x] Agent processes URLs sequentially (one at a time) via AutonomousService in background.js
- [x] Each URL opens in a background tab (user's current tab unchanged)
- [x] Background tab closes after processing (20-second load timeout)
- [x] Agent correctly handles URLs that fail to load (marks as error, continues)
- [x] Agent correctly handles sites that block scraping (marks as error, continues)
- [x] Stop button halts the agent via stopAutonomous message — button created dynamically in popup.js, removed when agent finishes
- [x] Final summary with "Download Results (CSV)" button
- [x] popup.js polls agent status every 1 second for live progress

---

## Epic 5: Data Export ✅ COMPLETE

### Story 5.1 — CSV Export

**Goal:** Allow users to download all autonomous results as a CSV file.

**Acceptance Criteria:**
- [x] "Download Results (CSV)" button appears after Autonomous Mode completes
- [x] CSV contains all results: URL, PBN Detected, Score, Emails, WhatsApp, Social Profiles, Email_1, Email_2, Email_3, Model Used
- [x] CSV is properly escaped for Excel compatibility
- [x] Download triggers immediately on button click (client-side, no API required)

---

## Epic 6: Hardening & Quality ✅ COMPLETE

### Story 6.1 — Functionality Gaps (11 fixes)

**Goal:** Fix all 11 functionality gaps identified in the v1.1 audit.

**Acceptance Criteria:**
- [x] **Gap 1** — URL validation: `new URL()` + Set dedup before agent starts
- [x] **Gap 2** — Rate limiting: configurable `batchDelayMs` (default 2000ms) between URLs
- [x] **Gap 3/9** — Email prompt quality: `targetUrl` + `targetDescription` injected into all prompts
- [x] **Gap 4** — Persistent storage: checkpoint saved to `chrome.storage.local` after every URL
- [x] **Gap 5** — Resume capability: "Resume from URL X/Y" button reads checkpoint; validates same URL batch
- [x] **Gap 6** — CORS fix: `findContactPages` in content.js delegates all fetches to background.js via `fetchContactPages` message
- [x] **Gap 7** — WhatsApp E.164: international numbers extracted via `/\+[1-9]\d{6,14}/g` in both content.js and background.js
- [x] **Gap 8** — mailto: links: discovered emails render as clickable `mailto:` links with individual clipboard copy buttons
- [x] **Gap 10** — Hunter.io: `HunterService.findEmails(domain, apiKey)` called when no emails found on page
- [x] **Gap 11** — 3-email sequence: `generateEmailSequence()` implemented on all 9 providers; parsed via positional indexing; tab UI in popup; Email_1/2/3 in CSV

---

### Story 6.2 — Security Gaps

**Goal:** Harden the extension against the 8 security gaps identified in audit.

**Acceptance Criteria:**
- [x] **Gap 1** — API keys stored in `chrome.storage.local` (not sync); auto-migrated from sync on first load
- [x] **Gap 2** — Host permissions narrowed from `<all_urls>` to `["https://*/*", "http://*/*"]`
- [x] **Gap 3** — Proxy backend (out of scope — documented known limitation for future Canva-wide rollout)
- [x] **Gap 4** — DOM sanitization: `pbnReasons` and all AI output inserted via `textContent`, never `innerHTML`; model names use `createElement` in settings.js
- [x] **Gap 5** — CSP added to manifest.json: `script-src 'self'; object-src 'self'`
- [x] **Gap 6** — API keys never displayed in settings UI: fields load blank with placeholder "(saved — leave blank to keep)"; save merges, not overwrites
- [x] **Gap 7** — Bluesminds/Straico: out of scope (user's choice to configure)
- [x] **Gap 8** — Canva brand voice in all email prompts: HUMAN / INSPIRING / EMPOWERING pillars + hard rules across all 9 LLM providers

---

### Story 6.3 — Code Audit & Bug Fixes

**Goal:** Fix all real bugs found during code review.

**Acceptance Criteria:**
- [x] **Bug 1 (CRITICAL)** — `background.js` message handler changed from `chrome.storage.sync.get` to `chrome.storage.local.get` — all AI calls now read the correct storage location
- [x] **Bug 2 (HIGH)** — `parseEmailSequence()` rewritten to use positional indexing (`parts[1]`, `parts[2]`, `parts[3]`) — immune to LLM preamble text before first `=== EMAIL 1 ===` marker
- [x] **Bug 3 (LOW)** — `HunterService.findEmails()` catch block now logs `console.error("[HunterService] findEmails failed:", err)` for debuggability

---

### Story 6.4 — Post-Launch Bug Fix: Straico Fetch Models

**Goal:** Fix Straico "Fetch Models" button returning HTML error instead of model list.

**Root Cause:** `settings.js` called `https://api.straico.com/v1/model` (non-existent endpoint) — server returned HTML error page, causing "Unexpected token '<', '<!DOCTYPE'" JSON parse error.

**Acceptance Criteria:**
- [x] **Bug 4 (MEDIUM)** — Straico Fetch Models endpoint corrected from `/v1/model` → `/v0/models` in `settings.js`
- [x] Response parser updated to handle both array format and object format `{chat:[…], image:[…]}` via `Object.values(data.data).flat()`

---

### Story 6.5 — Post-Launch Bug Fix: Stop Button, Groq Provider, Auto-Fallback, Google Sheets ID

**Goal:** Fix 3 bugs + 1 gap found in second code audit.

**Acceptance Criteria:**
- [x] **Bug 4 (HIGH)** — Stop button added to popup.js: dynamically created on agent start, sends `stopAutonomous` to background, removed when agent stops
- [x] **Bug 5 (HIGH)** — Groq provider added to `background.js` (`GroqProvider` class, `api.groq.com`, default `llama-3.3-70b-versatile`), `settings.js` (API_KEY_PROVIDERS + PROVIDER_FETCH + save/load), and `settings.html` (Groq section with Fetch Models button)
- [x] **Bug 6 (HIGH)** — Auto-fallback on 429: `callWithFallback()` helper added to `background.js`; tries each provider in order, skips on 429/quota/rate errors; message handler now uses it for `analyze` and `generateEmail` actions
- [x] **Gap 7 (LOW)** — Google Sheets ID field removed (field existed but had no implementation — replaced by CSV export)
