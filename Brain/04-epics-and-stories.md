# Epics & Stories: OutreachPilot

**Version:** 1.1
**Build Period:** Feb 24 – Mar 17, 2026
**Status:** ✅ ALL EPICS COMPLETE — Extension v1.1 Built & Live

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
- Implement settings.js to save/load from chrome.storage.sync
- Add ⚙️ icon in popup that opens settings page

**Acceptance Criteria:**
- [x] Settings page has fields for: Default Model (dropdown), API keys + Model ID for 9 providers (Gemini, Claude, OpenAI, Groq, OpenRouter, Grok, DeepSeek, Hugging Face, Straico), Your Name, Email Signature, Output Language, Google Sheets ID
- [x] Each provider has a "Fetch Models" button to auto-load available models
- [x] Clicking "Save" stores all values in chrome.storage.sync
- [x] Values persist after Chrome is restarted
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
- [x] Stop button halts the agent (via stopAutonomous message)
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
- [x] Stop button halts the agent via stopAutonomous message
- [x] Final summary with "Download Results (CSV)" button
- [x] popup.js polls agent status every 1 second for live progress

---

## Epic 5: Data Export ✅ COMPLETE

### Story 5.1 — CSV Export

**Goal:** Allow users to download all autonomous results as a CSV file.

**Acceptance Criteria:**
- [x] "Download Results (CSV)" button appears after Autonomous Mode completes
- [x] CSV contains all results: URL, Status, Score, Contact Email, Email Draft
- [x] CSV is properly escaped for Excel compatibility
- [x] Download triggers immediately on button click (client-side, no API required)
