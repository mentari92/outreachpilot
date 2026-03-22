/**
 * background.js - Service worker with LLM Factory support
 */

chrome.runtime.onInstalled.addListener(() => {
    console.log("OutreachPilot installed.");
});

// --- LLM Providers ---

class BaseProvider {
    static async callAPI(prompt, apiKey) { throw new Error("Not implemented"); }
    static async analyzeWebsite(data, apiKey) { throw new Error("Not implemented"); }
    static async generateEmail(data, apiKey) { throw new Error("Not implemented"); }
    static async generateEmailSequence(data, apiKey) { throw new Error("Not implemented"); }

    static extractJSON(text) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Invalid AI response format");
        return JSON.parse(jsonMatch[0]);
    }

    static getAnalysisPrompt(data) {
        return `
Analyze this website for link building and SEO outreach.

Data provided:
- Title: ${data.title}
- Meta Description: ${data.metaDescription}
- Navigation Menu: ${data.navText}
- Footer Info: ${data.footerText}
- Body Snippet: ${data.bodyText}
- Outbound Links (Count): ${data.outboundLinks}
- Author Info Detected: ${data.hasAuthor}
- Has "Write for us" / Guest Post link: ${data.hasGuestPostPage ? "YES" : "NO"}

Tasks:
1. **Identify PBN (Private Blog Network) Indicators**:
   - **Flag 1 (Mixed Niche)**: Does the site cover vastly different topics (e.g. Health, Finance, and Gambling) in the same navigation or body?
   - **Flag 2 (Footprint)**: Check Footer for generic copyright vs real business info.
   - **Flag 3 (Guest Post Focus)**: If a site has a "Write for Us" link and looks like it accepts any niche, it is likely a PBN/Link Farm.
   - **CRITICAL**: Do NOT mistake legitimate Local News Portals (like Banten Raya, Radar Cirebon, etc.) as PBNs. These sites have many categories but are real businesses with real addresses and journalists. Only mark PBN if it looks like a "Link Farm" designed ONLY for guest posts.

2. **Scoring Criteria**:
   - **nicheRelevance (0-100)**: Target specific authority.
   - **siteTrust (0-100)**: Is it a real business or just a site for selling links? High means high authority/trust.
   - **contentQuality (0-100)**: Depth of information.

JSON Structure:
{
  "isPBN": boolean,
  "pbnReasons": ["reason1", "reason2"],
  "contentQuality": 0-100,
  "nicheRelevance": 0-100,
  "siteTrust": 0-100,
  "overallScore": 0-100,
  "summary": "Short professional summary."
}
`;
    }

    static getEmailPrompt(data) {
        const lang = data.language || "English";
        const targetSection = data.targetUrl
            ? `\nWhat we offer: ${data.targetUrl}\nValue proposition: ${data.targetDescription || ""}` : "";
        return `
Write a short outreach email. You MUST write this email entirely in the following language: ${lang}.
Prospect site: ${data.siteUrl || data.title}
Site summary: ${data.summary}
Sender: ${data.userName || "Mentari"}${targetSection}
Signature: ${data.userSignature || ""}

CANVA BRAND VOICE — follow all rules below without exception:

HUMAN (pillar 1):
- Write like a real person talking to another real person — warm, simple, conversational
- Speak directly to the individual, not to "Webmaster" or "Dear Sir/Madam"
- Open with "Hi [Name]" or "Hey [Name]" — never "Dear", never "To whom it may concern"
- Use contractions always: we're, it's, you'll, don't, they've, I'd
- Max 15–20 words per sentence. Short paragraphs, max 2 sentences each.
- Language must be as simple to understand as Canva is to use

INSPIRING (pillar 2):
- Lead with something specific and relevant to their site — show you actually read it
- Never open with "I am writing to inform you" — use a short, direct, human opener instead
- Motivate them to act — make the opportunity feel exciting and achievable
- Spark curiosity or joy, not obligation
- Show, don't tell — demonstrate value with a concrete example or result, not vague claims

EMPOWERING (pillar 3):
- Make the prospect the hero, not Canva — frame the benefit around what they gain
- Talk about what their readers/audience will achieve, not about "our platform"
- Use "Canva" by name and reference the specific URL — never say "our tool" or "our service"
- Use empowering, uplifting language — celebrate what they can create or accomplish
- Close with a light, no-pressure call to action

HARD RULES (from brand guidelines):
- NO "Sincerely", "Best regards", "Warm regards", "Yours faithfully" — use only the provided signature
- NO bullet points or numbered lists in the email body
- NO marketing jargon: "leverage", "synergy", "solution", "platform", "touch base", "circle back"
- NO sentences longer than 20 words
- Subject line must be specific, benefit-focused, under 10 words — not generic like "Partnership Opportunity"

Format:
Subject: [subject]

[body]
`;
    }

    static getEmailSequencePrompt(data) {
        const lang = data.language || "English";
        const targetSection = data.targetUrl
            ? `\nWhat we offer: ${data.targetUrl}\nValue proposition: ${data.targetDescription || ""}` : "";
        return `
Write 3 outreach emails as a sequence. You MUST write all emails entirely in the following language: ${lang}.
Prospect site: ${data.siteUrl || data.title}
Site summary: ${data.summary}
Sender: ${data.userName || "Mentari"}${targetSection}
Signature: ${data.userSignature || ""}

CANVA BRAND VOICE — follow all rules below without exception:

HUMAN (pillar 1):
- Write like a real person talking to another real person — warm, simple, conversational
- Speak directly to the individual, not to "Webmaster" or generic titles
- Open with "Hi [Name]" or "Hey [Name]" — never "Dear", never "To whom it may concern"
- Use contractions always: we're, it's, you'll, don't, they've, I'd
- Max 15–20 words per sentence. Short paragraphs, max 2 sentences each.
- Language must be as simple to understand as Canva is to use

INSPIRING (pillar 2):
- Email 1: Lead with something specific and relevant to their site — show you actually read it
- Never open with "I am writing to inform you" — use a short, direct, human opener
- Motivate them to act — make the opportunity feel exciting and achievable, not like a chore
- Show, don't tell — demonstrate value with a concrete example, not vague claims

EMPOWERING (pillar 3):
- Make the prospect the hero, not Canva — frame benefits around what they gain
- Talk about what their readers/audience will achieve
- Use "Canva" by name and reference the specific URL — never say "our tool" or "our platform"
- Use empowering, uplifting language that celebrates what they can create or accomplish
- Each email must end with a light, no-pressure call to action

SEQUENCE TONE VARIATION:
- Email 1 (Day 0): Inspiring + warm — spark curiosity, make a clear ask
- Email 2 (Day 5–7): Playful + brief — a friendly nudge, not pushy. Add a new insight or tip.
- Email 3 (Day 12–14): Heartwarming + human — close the loop gracefully, leave them with a smile

HARD RULES:
- NO "Sincerely", "Best regards", "Warm regards" — use only the provided signature
- NO bullet points or numbered lists inside any email body
- NO jargon: "leverage", "synergy", "solution", "platform", "touch base", "circle back"
- NO sentences longer than 20 words
- Subject lines must be specific and benefit-focused, under 10 words — never "Partnership Opportunity"

Generate:
- Email 1 (Day 0 — Initial pitch): Introduce yourself and make the ask.
- Email 2 (Day 5-7 — Follow-up): Brief, friendly follow-up if no reply.
- Email 3 (Day 12-14 — Final check-in): Last attempt, no pressure.

Format each email exactly like this:
=== EMAIL 1 ===
Subject: [subject]

[body]

=== EMAIL 2 ===
Subject: [subject]

[body]

=== EMAIL 3 ===
Subject: [subject]

[body]
`;
    }

    static parseEmailSequence(text) {
        const parts = text.split(/===\s*EMAIL\s*\d+\s*===/i);
        return [
            (parts[1] || "").trim(),
            (parts[2] || "").trim(),
            (parts[3] || "").trim()
        ];
    }
}

class GeminiProvider extends BaseProvider {
    static async callAPI(prompt, apiKey, modelId) {
        const model = modelId || "gemini-2.0-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(`Gemini Error: ${err.error?.message || response.statusText}`);
        }
        const result = await response.json();
        return result.candidates[0].content.parts[0].text;
    }

    static async analyzeWebsite(data, apiKey, modelId) {
        const text = await this.callAPI(this.getAnalysisPrompt(data) + "\nReturn ONLY valid JSON.", apiKey, modelId);
        return this.extractJSON(text);
    }

    static async generateEmail(data, apiKey, modelId) {
        const text = await this.callAPI(this.getEmailPrompt(data), apiKey, modelId);
        return { email: text.trim() };
    }

    static async generateEmailSequence(data, apiKey, modelId) {
        const text = await this.callAPI(this.getEmailSequencePrompt(data), apiKey, modelId);
        return { emailSequence: this.parseEmailSequence(text) };
    }
}

class OpenAIProvider extends BaseProvider {
    static async callAPI(prompt, apiKey, systemPrompt, modelId) {
        const url = 'https://api.openai.com/v1/chat/completions';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelId || "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(`OpenAI Error: ${err.error?.message || response.statusText}`);
        }
        const result = await response.json();
        return result.choices[0].message.content;
    }

    static async analyzeWebsite(data, apiKey, modelId) {
        const text = await this.callAPI(this.getAnalysisPrompt(data), apiKey, "You are a JSON assistant.", modelId);
        return this.extractJSON(text);
    }

    static async generateEmail(data, apiKey, modelId) {
        const text = await this.callAPI(this.getEmailPrompt(data), apiKey, "You are an expert outreach writer.", modelId);
        return { email: text.trim() };
    }

    static async generateEmailSequence(data, apiKey, modelId) {
        const text = await this.callAPI(this.getEmailSequencePrompt(data), apiKey, "You are an expert outreach writer.", modelId);
        return { emailSequence: this.parseEmailSequence(text) };
    }
}

class ClaudeProvider extends BaseProvider {
    static async callAPI(prompt, apiKey, systemPrompt, modelId) {
        const url = 'https://api.anthropic.com/v1/messages';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: modelId || "claude-3-5-sonnet-latest",
                max_tokens: 2048,
                system: systemPrompt,
                messages: [{ role: "user", content: prompt }]
            })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(`Claude Error: ${err.error?.message || response.statusText}`);
        }
        const result = await response.json();
        return result.content[0].text;
    }

    static async analyzeWebsite(data, apiKey, modelId) {
        const text = await this.callAPI(this.getAnalysisPrompt(data), apiKey, "Return ONLY valid JSON.", modelId);
        return this.extractJSON(text);
    }

    static async generateEmail(data, apiKey, modelId) {
        const text = await this.callAPI(this.getEmailPrompt(data), apiKey, "You are an expert outreach writer.", modelId);
        return { email: text.trim() };
    }

    static async generateEmailSequence(data, apiKey, modelId) {
        const text = await this.callAPI(this.getEmailSequencePrompt(data), apiKey, "You are an expert outreach writer.", modelId);
        return { emailSequence: this.parseEmailSequence(text) };
    }
}

class GrokProvider extends BaseProvider {
    static async callAPI(prompt, apiKey, systemPrompt, modelId) {
        const url = 'https://api.x.ai/v1/chat/completions';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelId || "grok-beta",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(`Grok Error: ${err.error?.message || response.statusText}`);
        }
        const result = await response.json();
        return result.choices[0].message.content;
    }

    static async analyzeWebsite(data, apiKey, modelId) {
        const text = await this.callAPI(this.getAnalysisPrompt(data), apiKey, "You are a JSON assistant. Return ONLY valid JSON.", modelId);
        return this.extractJSON(text);
    }

    static async generateEmail(data, apiKey, modelId) {
        const text = await this.callAPI(this.getEmailPrompt(data), apiKey, "You are an expert outreach writer.", modelId);
        return { email: text.trim() };
    }

    static async generateEmailSequence(data, apiKey, modelId) {
        const text = await this.callAPI(this.getEmailSequencePrompt(data), apiKey, "You are an expert outreach writer.", modelId);
        return { emailSequence: this.parseEmailSequence(text) };
    }
}

class GroqProvider extends BaseProvider {
    static async callAPI(prompt, apiKey, systemPrompt, modelId) {
        const url = 'https://api.groq.com/openai/v1/chat/completions';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelId || "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(`Groq Error: ${err.error?.message || response.statusText}`);
        }
        const result = await response.json();
        return result.choices[0].message.content;
    }

    static async analyzeWebsite(data, apiKey, modelId) {
        const text = await this.callAPI(this.getAnalysisPrompt(data), apiKey, "You are a JSON assistant. Return ONLY valid JSON.", modelId);
        return this.extractJSON(text);
    }

    static async generateEmail(data, apiKey, modelId) {
        const text = await this.callAPI(this.getEmailPrompt(data), apiKey, "You are an expert outreach writer.", modelId);
        return { email: text.trim() };
    }

    static async generateEmailSequence(data, apiKey, modelId) {
        const text = await this.callAPI(this.getEmailSequencePrompt(data), apiKey, "You are an expert outreach writer.", modelId);
        return { emailSequence: this.parseEmailSequence(text) };
    }
}

class DeepSeekProvider extends BaseProvider {
    static async callAPI(prompt, apiKey, systemPrompt, modelId) {
        const url = 'https://api.deepseek.com/chat/completions';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelId || "deepseek-chat",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(`DeepSeek Error: ${err.error?.message || response.statusText}`);
        }
        const result = await response.json();
        return result.choices[0].message.content;
    }

    static async analyzeWebsite(data, apiKey, modelId) {
        const text = await this.callAPI(this.getAnalysisPrompt(data), apiKey, "You are a JSON assistant.", modelId);
        return this.extractJSON(text);
    }

    static async generateEmail(data, apiKey, modelId) {
        const text = await this.callAPI(this.getEmailPrompt(data), apiKey, "You are an expert outreach writer.", modelId);
        return { email: text.trim() };
    }

    static async generateEmailSequence(data, apiKey, modelId) {
        const text = await this.callAPI(this.getEmailSequencePrompt(data), apiKey, "You are an expert outreach writer.", modelId);
        return { emailSequence: this.parseEmailSequence(text) };
    }
}

class OpenRouterProvider extends BaseProvider {
    static async callAPI(prompt, apiKey, systemPrompt, modelId) {
        const url = 'https://openrouter.ai/api/v1/chat/completions';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://github.com/outreachpilot'
            },
            body: JSON.stringify({
                model: modelId || "openai/gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(`OpenRouter Error: ${err.error?.message || response.statusText}`);
        }
        const result = await response.json();
        return result.choices[0].message.content;
    }

    static async analyzeWebsite(data, apiKey, modelId) {
        const text = await this.callAPI(this.getAnalysisPrompt(data), apiKey, "You are a JSON assistant. Return ONLY valid JSON.", modelId);
        return this.extractJSON(text);
    }

    static async generateEmail(data, apiKey, modelId) {
        const text = await this.callAPI(this.getEmailPrompt(data), apiKey, "You are an expert outreach writer.", modelId);
        return { email: text.trim() };
    }

    static async generateEmailSequence(data, apiKey, modelId) {
        const text = await this.callAPI(this.getEmailSequencePrompt(data), apiKey, "You are an expert outreach writer.", modelId);
        return { emailSequence: this.parseEmailSequence(text) };
    }
}

class HuggingFaceProvider extends BaseProvider {
    static async callAPI(prompt, apiKey, modelId) {
        const model = modelId || "mistralai/Mistral-7B-Instruct-v0.3";
        const url = `https://api-inference.huggingface.co/models/${model}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: { max_new_tokens: 1000 }
            })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(`Hugging Face Error: ${err.error || response.statusText}`);
        }
        const result = await response.json();
        return result[0]?.generated_text || result.generated_text;
    }

    static async analyzeWebsite(data, apiKey, modelId) {
        const text = await this.callAPI(this.getAnalysisPrompt(data) + "\nReturn ONLY valid JSON.", apiKey, modelId);
        return this.extractJSON(text);
    }

    static async generateEmail(data, apiKey, modelId) {
        const text = await this.callAPI(this.getEmailPrompt(data), apiKey, modelId);
        return { email: text.trim() };
    }

    static async generateEmailSequence(data, apiKey, modelId) {
        const text = await this.callAPI(this.getEmailSequencePrompt(data), apiKey, modelId);
        return { emailSequence: this.parseEmailSequence(text) };
    }
}

class StraicoProvider extends BaseProvider {
    static async callAPI(prompt, apiKey, systemPrompt, modelId) {
        const url = 'https://api.straico.com/v1/prompt/completion';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                models: [modelId || "openai/gpt-4o-mini"],
                message: `${systemPrompt}\n\n${prompt}`
            })
        });
        if (!response.ok) {
            let errMsg = response.statusText;
            try {
                const err = await response.json();
                errMsg = (typeof err.error === 'string' ? err.error : err.error?.message) || err.message || err.detail || JSON.stringify(err);
            } catch (_) {}
            throw new Error(`Straico Error ${response.status}: ${errMsg}`);
        }
        const result = await response.json();
        if (!result.data || !result.data.completions) {
            throw new Error(`Straico Error: Unexpected response format - ${JSON.stringify(result)}`);
        }
        const returnedModel = Object.keys(result.data.completions)[0];
        const completion = result.data.completions[returnedModel];
        const content = completion?.completion?.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error(`Straico Error: Could not extract content - ${JSON.stringify(completion)}`);
        }
        return content;
    }

    static async analyzeWebsite(data, apiKey, modelId) {
        const text = await this.callAPI(this.getAnalysisPrompt(data), apiKey, "You are a JSON assistant. Return ONLY valid JSON.", modelId);
        return this.extractJSON(text);
    }

    static async generateEmail(data, apiKey, modelId) {
        const text = await this.callAPI(this.getEmailPrompt(data), apiKey, "You are an expert outreach writer.", modelId);
        return { email: text.trim() };
    }

    static async generateEmailSequence(data, apiKey, modelId) {
        const text = await this.callAPI(this.getEmailSequencePrompt(data), apiKey, "You are an expert outreach writer.", modelId);
        return { emailSequence: this.parseEmailSequence(text) };
    }
}

// --- Background-side extraction helpers (used for CORS-free contact page fetching) ---

function bgExtractEmails(text) {
    const standard = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const obfuscated = (text.match(/[a-zA-Z0-9._%+-]+\s*[\[\(]\s*at\s*[\]\)]\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi) || [])
        .map(e => e.replace(/\s*[\[\(]\s*at\s*[\]\)]\s*/i, '@'));
    return Array.from(new Set([...standard, ...obfuscated]));
}

function bgExtractWhatsApp(text, html) {
    const waNumbers = [];
    // URL-based: wa.me / whatsapp.com/send
    const waLinkMatches = (html || "").match(/href="[^"]*(?:wa\.me|whatsapp\.com\/send)[^"]*"/g) || [];
    waLinkMatches.forEach(m => {
        const num = m.match(/wa\.me\/(\d+)/) || m.match(/phone=(\d+)/);
        if (num) waNumbers.push(num[1]);
    });
    // Indonesian numbers
    const idMatches = text.match(/(?:\+62|62|0)8[1-9][0-9]{7,11}/g) || [];
    idMatches.forEach(num => {
        let clean = num.replace(/\D/g, '');
        if (clean.startsWith('0')) clean = '62' + clean.substring(1);
        if (clean.length >= 10 && clean.length <= 15) waNumbers.push(clean);
    });
    // Generic E.164 international (e.g. +44..., +1..., +81...)
    const intlMatches = text.match(/\+[1-9]\d{6,14}/g) || [];
    intlMatches.forEach(num => {
        const clean = num.replace(/\D/g, '');
        if (clean.length >= 7 && clean.length <= 15) waNumbers.push(clean);
    });
    return Array.from(new Set(waNumbers));
}

// --- Hunter.io Service ---

class HunterService {
    static async findEmails(domain, apiKey) {
        try {
            const url = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${apiKey}`;
            const resp = await fetch(url);
            if (!resp.ok) return [];
            const data = await resp.json();
            return (data.data?.emails || []).map(e => ({
                email: e.value,
                role: e.type,
                confidence: e.confidence,
                firstName: e.first_name,
                lastName: e.last_name
            }));
        } catch (err) {
            console.error("[HunterService] findEmails failed:", err);
            return [];
        }
    }
}

// --- Autonomous Service ---

class AutonomousService {
    static isRunning = false;
    static results = [];
    static uiResults = [];
    static currentIdx = 0;
    static totalUrls = 0;
    static currentUrl = "";
    static statusMessage = "";
    static urls = [];

    static async start(urls, settings, resumeFromCheckpoint = false) {
        if (this.isRunning) return;
        this.isRunning = true;
        this.totalUrls = urls.length;
        this.statusMessage = "Starting autonomous agent...";
        this.urls = urls;

        const model = settings.defaultModel || 'gemini';
        const apiKey = settings.apiKeys ? settings.apiKeys[model] : null;
        const delayMs = parseInt(settings.batchDelayMs) || 2000;

        if (!apiKey) {
            this.statusMessage = "Error: API Key not configured.";
            this.isRunning = false;
            return;
        }

        const provider = LLMFactory.getProvider(model);
        const customModelId = settings.models ? settings.models[model] : null;

        // Resume from checkpoint if requested
        let startIdx = 0;
        if (resumeFromCheckpoint) {
            const stored = await chrome.storage.local.get('autonomousCheckpoint');
            const cp = stored.autonomousCheckpoint;
            if (cp && cp.urls && cp.urls.join('|') === urls.join('|')) {
                startIdx = cp.currentIdx || 0;
                this.results = cp.results || [];
                this.uiResults = cp.uiResults || [];
                this.statusMessage = `Resuming from URL ${startIdx + 1}/${urls.length}...`;
            }
        } else {
            this.results = [];
            this.uiResults = [];
            await chrome.storage.local.remove('autonomousCheckpoint');
        }
        this.currentIdx = startIdx;

        for (let i = startIdx; i < urls.length; i++) {
            if (!this.isRunning) break;
            this.currentIdx = i;
            const url = urls[i];
            this.currentUrl = url;
            this.statusMessage = `[${i + 1}/${urls.length}] Processing ${url.substring(0, 40)}...`;

            let tabId = null;
            let hadError = false;
            try {
                const tab = await chrome.tabs.create({ url, active: false });
                tabId = tab.id;

                await new Promise((resolve) => {
                    let timeout = setTimeout(() => {
                        chrome.tabs.onUpdated.removeListener(listener);
                        resolve();
                    }, 20000);

                    function listener(tabIdUpdated, info) {
                        if (tabIdUpdated === tabId && info.status === 'complete') {
                            clearTimeout(timeout);
                            chrome.tabs.onUpdated.removeListener(listener);
                            resolve();
                        }
                    }
                    chrome.tabs.onUpdated.addListener(listener);
                });

                await new Promise(r => setTimeout(r, delayMs));

                const scrapeData = await chrome.tabs.sendMessage(tab.id, { action: "scrape" });

                // Hunter.io fallback if no emails found on page
                if ((!scrapeData.emails || scrapeData.emails.length === 0) && settings.apiKeys?.hunterio) {
                    this.statusMessage = `[${i + 1}/${urls.length}] No emails — trying Hunter.io...`;
                    const domain = new URL(url).hostname;
                    const hunterResults = await HunterService.findEmails(domain, settings.apiKeys.hunterio);
                    if (hunterResults.length > 0) {
                        scrapeData.emails = hunterResults.map(e => e.email);
                        scrapeData.hunterData = hunterResults;
                    }
                }

                const aiResult = await provider.analyzeWebsite(scrapeData, apiKey, customModelId);
                aiResult.modelUsed = model;

                if (aiResult.error) throw new Error(aiResult.error);

                let emailSequence = null;
                if (aiResult.overallScore >= 60) {
                    const emailRes = await provider.generateEmailSequence({
                        siteUrl: url,
                        title: aiResult.summary,
                        summary: aiResult.summary,
                        userName: settings.userName,
                        userSignature: settings.userSignature,
                        language: settings.emailLanguage || "English",
                        targetUrl: settings.targetUrl || "",
                        targetDescription: settings.targetDescription || ""
                    }, apiKey, customModelId);
                    emailSequence = emailRes.emailSequence;
                }

                const logData = {
                    ...aiResult, url, ...scrapeData,
                    emailDraft: emailSequence ? emailSequence[0] : "",
                    Email_1: emailSequence ? emailSequence[0] : "",
                    Email_2: emailSequence ? emailSequence[1] : "",
                    Email_3: emailSequence ? emailSequence[2] : ""
                };
                this.results.push(logData);
                this.uiResults.unshift({ url, aiResult, emailSequence });

            } catch (err) {
                hadError = true;
                const errorMsg = err.message.includes('Receiving end does not exist')
                    ? 'Failed to connect (site blocked bot or loaded too slowly).'
                    : err.message;

                this.results.push({ url, error: errorMsg, isPBN: false, overallScore: 0 });
                this.uiResults.unshift({ url, error: errorMsg });
            } finally {
                if (tabId) await chrome.tabs.remove(tabId);
            }

            // Save checkpoint after each URL processed
            await chrome.storage.local.set({
                autonomousCheckpoint: {
                    urls,
                    currentIdx: i + 1,
                    results: this.results,
                    uiResults: this.uiResults,
                    savedAt: Date.now()
                }
            });

            // Extra backoff delay after errors
            if (hadError && i < urls.length - 1) {
                await new Promise(r => setTimeout(r, delayMs * 2));
            }
        }

        if (this.isRunning) {
            this.statusMessage = `✅ Completed processing ${urls.length} URLs!`;
            await chrome.storage.local.remove('autonomousCheckpoint');
        } else {
            this.statusMessage = `🛑 Stopped at URL ${this.currentIdx + 1} of ${urls.length}. Progress saved — you can Resume.`;
        }
        this.isRunning = false;
    }

    static stop() {
        this.isRunning = false;
        this.statusMessage = "🛑 Stopped by user.";
    }

    static getStatus() {
        return {
            isRunning: this.isRunning,
            statusMessage: this.statusMessage,
            results: this.results,
            uiResults: this.uiResults,
            currentIdx: this.currentIdx,
            totalUrls: this.totalUrls,
            urls: this.urls
        };
    }
}

class LLMFactory {
    static getProvider(modelName) {
        switch (modelName) {
            case 'openai': return OpenAIProvider;
            case 'claude': return ClaudeProvider;
            case 'grok': return GrokProvider;
            case 'groq': return GroqProvider;
            case 'deepseek': return DeepSeekProvider;
            case 'openrouter': return OpenRouterProvider;
            case 'huggingface': return HuggingFaceProvider;
            case 'straico': return StraicoProvider;
            case 'gemini':
            default: return GeminiProvider;
        }
    }
}

// --- Auto-Fallback Helper ---

const FALLBACK_ORDER = ['gemini','claude','openai','groq','openrouter','grok','deepseek','huggingface','straico'];

async function callWithFallback(action, data, settings) {
    const preferred = settings.defaultModel || 'gemini';
    const order = [preferred, ...FALLBACK_ORDER.filter(p => p !== preferred)];
    for (const model of order) {
        const apiKey = settings.apiKeys?.[model];
        if (!apiKey) continue;
        try {
            const Provider = LLMFactory.getProvider(model);
            if (!Provider) continue;
            const customModel = settings.models?.[model];
            let result;
            if (action === 'analyzeWebsite') {
                result = await Provider.analyzeWebsite(data, apiKey, customModel);
            } else {
                result = await Provider.generateEmailSequence(data, apiKey, customModel);
            }
            result.modelUsed = model;
            return result;
        } catch (err) {
            const msg = err.message || '';
            if (msg.includes('429') || msg.includes('quota') || msg.includes('rate')) continue;
            throw err;
        }
    }
    throw new Error('All providers failed or have no API key configured.');
}

// --- Message Listener ---

// Configure side panel behavior: open side panel on icon click
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Gap 6: Fetch contact pages from background to bypass CORS restrictions
    if (request.action === "fetchContactPages") {
        Promise.all((request.urls || []).map(async url => {
            try {
                const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
                const html = await resp.text();
                return { html, text: html.replace(/<[^>]*>?/gm, ' ') };
            } catch { return { html: "", text: "" }; }
        })).then(pages => {
            const emails = [];
            const waNumbers = [];
            pages.forEach(({ html, text }) => {
                emails.push(...bgExtractEmails(text));
                waNumbers.push(...bgExtractWhatsApp(text, html));
            });
            sendResponse({
                emails: Array.from(new Set(emails)),
                whatsapp: Array.from(new Set(waNumbers))
            });
        });
        return true;
    }

    // Gap 5: Check if a resume checkpoint exists
    if (request.action === "checkCheckpoint") {
        chrome.storage.local.get('autonomousCheckpoint', (stored) => {
            const cp = stored.autonomousCheckpoint;
            if (cp && cp.currentIdx > 0 && cp.urls && cp.urls.length > 0) {
                sendResponse({ hasCheckpoint: true, currentIdx: cp.currentIdx, totalUrls: cp.urls.length, urls: cp.urls });
            } else {
                sendResponse({ hasCheckpoint: false });
            }
        });
        return true;
    }

    chrome.storage.local.get(
        ['defaultModel', 'apiKeys', 'models', 'userName', 'userSignature', 'emailLanguage', 'targetUrl', 'targetDescription', 'batchDelayMs'],
        (settings) => {
            if (request.action === "analyze") {
                callWithFallback('analyzeWebsite', request.data, settings)
                    .then(res => sendResponse(res))
                    .catch(error => sendResponse({ error: error.message }));
            } else if (request.action === "generateEmail") {
                // Gap 11: Generate full 3-email sequence with fallback
                callWithFallback('generateEmailSequence', {
                    ...request.data,
                    targetUrl: settings.targetUrl || "",
                    targetDescription: settings.targetDescription || ""
                }, settings)
                    .then(sendResponse)
                    .catch(error => sendResponse({ error: error.message }));
            } else if (request.action === "startAutonomous") {
                AutonomousService.start(request.urls, settings, false);
                sendResponse({ success: true });
            } else if (request.action === "resumeAutonomous") {
                AutonomousService.start(request.urls, settings, true);
                sendResponse({ success: true });
            } else if (request.action === "stopAutonomous") {
                AutonomousService.stop();
                sendResponse({ success: true });
            } else if (request.action === "getAutonomousStatus") {
                sendResponse(AutonomousService.getStatus());
            }
        }
    );
    return true;
});
