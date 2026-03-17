# Project Brief: OutreachPilot — AI-Powered Outreach Co-Pilot

**Version:** 1.1
**Status:** Built — Extension v1.1 Live
**Team:** Canva Link Building Team — H1 2026 AI Challenge

---

## Problem Statement

Link building and outreach teams spend a significant amount of time on manual, repetitive tasks that don't require human judgment:

- **QA checking websites** — manually visiting each prospect to assess content quality, niche relevance, and PBN red flags. Takes 3–5 minutes per site.
- **Finding contact info** — manually searching for emails, WhatsApp numbers, or social media handles on each website.
- **Writing outreach emails** — manually crafting personalized emails for each prospect based on their site's content and tone.
- **Tracking prospects** — manually copying data into Google Sheets after each check.

The result: outreach specialists waste hours each day on low-value tasks instead of focusing on strategy, relationship building, and follow-ups.

---

## Solution

**OutreachPilot** is a Chrome Extension that acts as an AI-powered co-pilot for link building and outreach teams. It lives in the browser and automates the most time-consuming parts of the outreach workflow — directly where the work happens.

The extension operates in two modes:

### Manual Mode
- User visits a prospect website
- Extension automatically scans and analyzes the page
- Detects PBN red flags and assigns a QA Score (0–100)
- Extracts contact info (email, WhatsApp, social media)
- Generates a personalized outreach email if the site passes QA
- Saves results to Google Sheets with one click

### Autonomous Mode (AI Agent)
- User pastes a list of URLs
- Extension processes all URLs automatically in the background
- Runs PBN detection, QA scoring, contact extraction, and email generation for each
- Logs everything to Google Sheets automatically
- User can pause or stop anytime

---

## Target Users

**Primary:** Link building and outreach specialists at Canva (EN and i18n markets)

**Secondary:** Any outreach team doing manual prospect QA and email personalization at scale

**User Persona:** Mentari, outreach specialist at Canva. Daily workflow includes sending outreach emails, QA checking websites, researching new prospects, and managing follow-ups. These tasks are repetitive and time-consuming — OutreachPilot automates them so she can focus on strategy and relationships.

---

## Key Features

| Feature | Description |
|---|---|
| PBN Detection | AI detects Private Blog Network red flags before scoring |
| QA Scoring | Scores each site on Content Quality, Niche Relevance, and Outreach Viability |
| Contact Extraction | Finds emails, WhatsApp numbers, and social media profiles |
| Email Generator | Generates personalized outreach emails based on site content and tone |
| Autonomous Mode | Processes bulk URL lists automatically without user intervention |
| Google Sheets Logger | Logs all scan results and email drafts automatically |
| Multi-LLM Support | Supports 8 providers: Gemini, Claude, OpenAI, Groq, OpenRouter, Grok (xAI), DeepSeek, Hugging Face, Straico — with auto-fallback |
| Deep Contact Scanning | Scans /contact, /about, /legal pages for additional emails & WhatsApp beyond the main page |
| Multi-language Emails | Email generation in any language (configurable in settings) |
| CSV Export | Download all autonomous mode results as a CSV file |

---

## Success Metrics

- Time saved per prospect: from 3–5 minutes → under 30 seconds
- Autonomous mode: process 50 URLs with zero manual effort
- Adoption: used by at least 3 team members within the first week
- Presented and voted top 3 at Canva H1 2026 AI Challenge presentation

---

## Tech Stack (Locked)

| Component | Technology |
|---|---|
| Extension Framework | Chrome Manifest V3 |
| Frontend | Vanilla HTML / CSS / JavaScript |
| AI | Multi-LLM via separate API keys (Gemini, Claude, OpenAI, Groq, OpenRouter, Grok/xAI, DeepSeek, Hugging Face, Straico) |
| Storage | Chrome Storage API (local) |
| Sheets Integration | Google Sheets API v4 |

---

## Constraints

- Must be buildable within 1–2 weeks (H1 2026 Challenge deadline: Mar 4)
- No backend required — all logic runs client-side in the extension
- No Chrome Web Store publishing required — loaded as unpacked extension for internal use
- Must be shareable, documented, and usable by other team members

---

## Out of Scope

- Publishing to Chrome Web Store
- Backend server or database
- Gmail sending automation (copy-paste only)
- CRM integration (Google Sheets only for now)
