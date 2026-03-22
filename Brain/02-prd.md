# Product Requirements Document: OutreachPilot

**Version:** 1.1
**Status:** Built — v1.1 Live

---

## 1. Functional Requirements

### FR-1: PBN Detection
- The extension MUST analyze website content and detect PBN red flags before scoring
- Red flags to detect:
  - Thin or low-quality content
  - Excessive number of outbound links
  - No author information found
  - Generic or template-style design
  - Unrelated content mix across the site
- If PBN is detected → stop analysis, show warning, do not generate email
- If NOT PBN → continue to QA scoring

### FR-2: QA Scoring
- Extension MUST calculate a QA Score (0–100) for each non-PBN site
- Score breakdown:
  - Content Quality (33%) — Is the content original and valuable?
  - Niche Relevance (33%) — Is this a real editorial site in the right niche?
  - Site Trust (34%) — Is this a trustworthy, non-spammy site worth reaching out to?
- If Overall Score < 60 → show warning, not recommended for outreach
- If Overall Score ≥ 60 → show "Generate Email" button

### FR-3: Contact Info Extraction
- content.js MUST scrape the following from every website visited:
  - Email addresses (via mailto: links, visible text patterns, and obfuscated formats like "name [at] domain.com")
  - WhatsApp numbers (via wa.me links and Indonesian phone number patterns)
  - Social media profiles: Instagram, LinkedIn, Twitter/X, Facebook, TikTok
- **Deep Scanning:** Also checks /contact, /about, /legal sub-pages for additional contact info not found on the main page
- Deduplicates all found contacts across pages
- Detects "Write for Us" / "Guest Post" pages to flag link farm sites
- Display all found contact info in the popup after scan

### FR-4: Personalized Email Generator
- After QA Score ≥ 60, user can click "Generate Email"
- LLM generates a personalized cold outreach email based on:
  - Website niche and content angle
  - Tone of the site
  - Contact name if found
  - User's name and email signature from settings
  - Output language (configurable in settings — defaults to English)
- Email must include a "Copy" button for easy use

### FR-5: Manual Mode
- Extension icon in Chrome toolbar opens a popup (400px wide)
- Popup automatically triggers scan when opened on any website
- User can see: PBN status, QA score breakdown, contact info, generated email
- User can save results to Google Sheets with one click

### FR-6: Autonomous Mode (AI Agent)
- User switches to "Autonomous" tab in popup
- User pastes a list of URLs (one per line) into a textarea
- User clicks "Run Agent"
- Extension processes each URL automatically via AutonomousService in background.js:
  1. Opens URL in a background tab (20-second load timeout)
  2. Waits 1 second after load, then runs content scraping
  3. Runs PBN detection
  4. Calculates QA score
  5. Generates email draft if score ≥ 60
  6. Updates live progress in popup (polled every 1 second)
  7. Closes background tab and moves to next URL
- User can Pause or Stop the agent at any time
- Final summary shown when all URLs are processed
- "Download Results (CSV)" button appears after completion

### FR-7: CSV Export (replaces Google Sheets Logger)
- After Autonomous Mode completes, all results are available as a downloadable CSV file
- CSV includes: URL, PBN Detected, Score, Emails, WhatsApp, Social Profiles, Email_1, Email_2, Email_3, Model Used (14 columns total)
- Properly escaped for Excel compatibility
- Download triggers client-side — no API required
- ~~Google Sheets integration was descoped~~ (field removed from settings; CSV export is the export mechanism)

### FR-8: Multi-LLM Support with Auto-Fallback
- User can input separate API keys for each provider in settings:
  - Gemini (Google AI)
  - Claude (Anthropic)
  - OpenAI (GPT)
  - Grok (xAI)
  - Groq (api.groq.com — fast inference)
  - OpenRouter
  - DeepSeek
  - Hugging Face
  - Straico
- User selects a Default Model from a dropdown (includes all 9 providers)
- Each provider has a configurable Model ID field + "Fetch Models" button (except Hugging Face — manual entry)
- Auto-fallback via `callWithFallback()` in background.js: on 429/quota/rate error → tries next provider with a configured key
- Priority fallback order: Gemini → Claude → OpenAI → Groq → OpenRouter → Grok → DeepSeek → Hugging Face → Straico
- Currently active model name is always shown in the popup UI

### FR-9: Settings Page
- Extension MUST have a settings page accessible via ⚙️ icon
- Settings fields:
  - Default Model (dropdown — all 9 providers)
  - Per provider: API Key + Model ID + "Fetch Models" button
    - Gemini, Claude, OpenAI, Grok (xAI), Groq, OpenRouter, DeepSeek, Hugging Face, Straico
  - Hunter.io API Key (optional — email discovery fallback)
  - Your Name
  - Email Signature
  - Output Language (for email generation)
  - Your Product / Landing Page URL
  - Value Proposition
  - Delay Between URLs (ms)
- All settings stored in **`chrome.storage.local`** — API keys never leave the device (not synced)

### FR-10: CSV Export
- After Autonomous Mode completes, user can download all results as a CSV file
- CSV includes: URL, Status, Score, Contact Email, Email Draft columns
- Properly escaped for Excel compatibility

### FR-11: Multi-language Email Generation
- User can set preferred output language in settings
- All generated outreach emails are written in the configured language
- Default: English

---

## 2. Non-Functional Requirements

### NFR-1: Performance
- Manual scan must complete within 10 seconds
- Autonomous mode must process at minimum 1 URL per 15 seconds

### NFR-2: Security
- All API keys stored in Chrome Storage API (never exposed in code)
- No API keys sent to any third-party except the respective LLM provider

### NFR-3: Reliability
- Extension must not crash if a website blocks scraping
- If LLM API fails, show clear error message and suggest switching model

### NFR-4: Usability
- Popup UI must be clean and usable without any training
- All key actions must be reachable within 2 clicks from the popup

### NFR-5: Shareability
- Extension must be loadable as unpacked Chrome Extension (no Web Store publishing)
- Must include clear installation instructions for non-technical team members

---

## 3. User Stories

### Manual Mode
- As an outreach specialist, I want to open the extension on a prospect website and instantly see if it's a PBN, so I don't waste time on bad prospects.
- As an outreach specialist, I want to see a QA score breakdown, so I can make an informed decision about whether to reach out.
- As an outreach specialist, I want the extension to find the site's contact email and WhatsApp automatically, so I don't have to search manually.
- As an outreach specialist, I want to generate a personalized outreach email in one click, so I can send it immediately without writing from scratch.
- As an outreach specialist, I want to save each prospect's data to Google Sheets automatically, so I can track my outreach history.

### Autonomous Mode
- As an outreach specialist, I want to paste a list of 50 URLs and have the AI process all of them while I do other work, so I can qualify prospects at scale.
- As an outreach specialist, I want to see live progress as the agent works, so I know what's happening.
- As an outreach specialist, I want to pause the agent if needed, so I have control over the process.

### Settings
- As a user, I want to input my own API keys for each LLM provider, so I can use the model I prefer.
- As a user, I want the extension to automatically switch to another model if my primary one runs out of quota, so it never stops working.

---

## 4. Acceptance Criteria Summary

| Feature | Acceptance Criteria |
|---|---|
| PBN Detection | Correctly flags known PBN sites; does not flag legitimate editorial sites |
| QA Score | Returns score 0–100 with 3 sub-scores (Content Quality, Niche Relevance, Site Trust) for every non-PBN site |
| Contact Extraction | Finds at least email or social profile on 70%+ of real editorial sites; deep scans /contact and /about pages |
| Email Generator | Generates a relevant, personalized email in the configured language that references the site's actual content |
| Autonomous Mode | Successfully processes a list of 10 URLs end-to-end without manual intervention; CSV download available on completion |
| Google Sheets | All scan data appears correctly in the specified sheet after each scan |
| Auto-Fallback | When primary model quota is exceeded, seamlessly switches to next available model (9 providers supported) |
| Settings | All settings persist after Chrome is restarted; model IDs configurable per provider |
| CSV Export | Downloads correctly formatted CSV with all autonomous results |
| Multi-language | Generated emails respect the output language setting |
