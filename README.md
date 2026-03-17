# OutreachPilot ✨

**An AI-Powered Co-Pilot for Link Building & Outreach Teams**

*Created by Mentari Rahman*

> 🏢 **Note:** This is a proprietary internal project created by Mentari Rahman during their time at Canva for the H1 2026 AI Challenge.

---

## 🎯 What is OutreachPilot?

Link building and outreach teams spend a significant amount of time on manual, repetitive tasks that don't require human judgment—such as QA checking websites, hunting for contact information, and manually crafting personalized emails.

**OutreachPilot** is a Chrome Extension that acts as an AI-powered co-pilot to automate the most time-consuming parts of the outreach workflow, right where the work happens in the browser.

By automating low-value tasks like repetitive QA checks and basic personalization, it allows outreach specialists to focus on strategy, relationship building, and follow-ups.

---

## ✨ Key Features

- 🕵️‍♂️ **PBN Detection:** AI detects Private Blog Network red flags before moving forward with prospect scoring.
- 💯 **QA Scoring:** Scores each site on Content Quality, Niche Relevance, and Outreach Viability (0–100 scale).
- 📇 **Deep Contact Extraction:** Automatically finds emails, WhatsApp numbers, and social media profiles (scans main, `/contact`, `/about`, and `/legal` pages).
- ✉️ **AI Email Generator:** Generates hyper-personalized outreach emails based on site content and your specified tone.
- 🤖 **Autonomous Mode:** Paste a list of URLs and let the extension process them all automatically in the background.
- 📊 **Google Sheets Integration:** Automatically logs all scan results, scores, and email drafts directly to your Google Sheet with one click.
- 🧠 **Multi-LLM Support:** Supports 9 top-tier AI providers (Gemini, Claude, OpenAI, Groq, OpenRouter, Grok/xAI, DeepSeek, Hugging Face, Straico) with automatic fallback.
- 🌍 **Multi-language Support:** Generate emails in any language (configurable in settings).
- 💾 **CSV Export:** Easily download your autonomous mode results as a CSV file.

---

## 🚀 Quick Start / How to Use

### 1. Installation
This extension uses Chrome Manifest V3 and is loaded as an internal unpacked extension.
1. Download or clone this repository to your computer.
2. Open Google Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top right corner).
4. Click **Load unpacked** and select the `src` folder from this repository.

### 2. Configuration
1. Click the OutreachPilot icon in your Chrome toolbar.
2. Go to **Settings** (gear icon).
3. Enter your preferred AI Provider API key (e.g., OpenAI, Anthropic, or OpenRouter).
4. (Optional) Provide your Google Sheets API setup to enable automatic logging.

### 3. Usage Modes

#### A. Manual Mode (Interactive)
1. Visit any prospect website.
2. Open the OutreachPilot extension.
3. The extension instantly scans the page context, scores the QA metrics, extracts contacts, and generates an outreach email.
4. Click to log the result to your Google Sheets.

#### B. Autonomous Mode (Bulk Processing)
1. Open the Autonomous Mode inside the extension.
2. Paste your list of target URLs.
3. Hit start! The extension will process all URLs automatically in the background, performing PBN checks, scoring, and email generation block-by-block.
4. Download the aggregated results as a CSV once complete.

---

## 🛠 Tech Stack

- **Extension Framework:** Chrome Manifest V3
- **Frontend:** Vanilla HTML / CSS / JavaScript (No external UI frameworks to keep it lightweight)
- **AI Logic:** Multi-LLM integration via separate API keys (Client-side)
- **Storage:** Chrome local storage API
- **Integrations:** Google Sheets API v4

---

## 👨‍💻 Author

**Mentari Rahman**
*Canva Link Building Team — H1 2026 AI Challenge*

---

*Note: This tool is intended for internal use and streamlines the QA and outreach personalization workflow. It does not automate the actual sending of emails from Gmail.*
