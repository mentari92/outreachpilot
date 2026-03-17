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
        return `
Write a short outreach email. You MUST write this email entirely in the following language: ${lang}.
Site: ${data.title}
Summary: ${data.summary}
Sender: ${data.userName || "Mentari"}
Signature: ${data.userSignature || ""}

Format:
Subject: [subject]

[body]
`;
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
                max_tokens: 1024,
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
                model: modelId || "openai/gpt-4o-mini", // Fallback fast model for OpenRouter
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
                parameters: { max_new_tokens: 500 }
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
}

// --- LLM Factory ---

// --- Autonomous Service ---

class AutonomousService {
    static isRunning = false;
    static results = [];
    static uiResults = [];
    static currentIdx = 0;
    static totalUrls = 0;
    static currentUrl = "";
    static statusMessage = "";

    static async start(urls, settings) {
        if (this.isRunning) return;
        this.isRunning = true;
        this.results = [];
        this.uiResults = [];
        this.totalUrls = urls.length;
        this.currentIdx = 0;
        this.statusMessage = "Starting autonomous agent...";

        const model = settings.defaultModel || 'gemini';
        const apiKey = settings.apiKeys ? settings.apiKeys[model] : null;

        if (!apiKey) {
            this.statusMessage = "Error: API Key not configured.";
            this.isRunning = false;
            return;
        }

        const provider = LLMFactory.getProvider(model);
        const customModelId = settings.models ? settings.models[model] : null;

        for (let i = 0; i < urls.length; i++) {
            if (!this.isRunning) break;
            this.currentIdx = i;
            const url = urls[i];
            this.currentUrl = url;
            this.statusMessage = `[${i + 1}/${urls.length}] Processing ${url.substring(0, 30)}...`;

            let tabId = null;
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

                await new Promise(r => setTimeout(r, 1000));

                const scrapeData = await chrome.tabs.sendMessage(tab.id, { action: "scrape" });

                const aiResult = await provider.analyzeWebsite(scrapeData, apiKey, customModelId);
                aiResult.modelUsed = model;

                if (aiResult.error) throw new Error(aiResult.error);

                let generatedEmail = null;
                if (aiResult.overallScore >= 60) {
                    const emailRes = await provider.generateEmail({
                        title: aiResult.summary,
                        summary: aiResult.summary,
                        userName: settings.userName,
                        userSignature: settings.userSignature,
                        language: settings.emailLanguage || "English"
                    }, apiKey, customModelId);
                    generatedEmail = emailRes.email;
                }

                const logData = { ...aiResult, url, ...scrapeData, emailDraft: generatedEmail || "" };
                this.results.push(logData);
                this.uiResults.unshift({ url, aiResult, emailDraft: generatedEmail });

            } catch (err) {
                const errorMsg = err.message.includes('Receiving end does not exist')
                    ? 'Failed to connect (site blocked bot or loaded too slowly).'
                    : err.message;

                this.results.push({ url, error: errorMsg, isPBN: false, overallScore: 0 });
                this.uiResults.unshift({ url, error: errorMsg });
            } finally {
                if (tabId) await chrome.tabs.remove(tabId);
            }
        }

        if (this.isRunning) {
            this.statusMessage = `✅ Completed processing ${urls.length} URLs!`;
        } else {
            this.statusMessage = `🛑 Stopped. Processed ${this.currentIdx} URLs.`;
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
            totalUrls: this.totalUrls
        };
    }
}

class LLMFactory {
    static getProvider(modelName) {
        switch (modelName) {
            case 'openai': return OpenAIProvider;
            case 'claude': return ClaudeProvider;
            case 'grok': return GrokProvider;
            case 'deepseek': return DeepSeekProvider;
            case 'openrouter': return OpenRouterProvider;
            case 'huggingface': return HuggingFaceProvider;
            case 'straico': return StraicoProvider;
            case 'gemini':
            default: return GeminiProvider;
        }
    }
}

// --- Message Listener ---

// Configure side panel behavior: open side panel on icon click
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    chrome.storage.sync.get(['defaultModel', 'apiKeys', 'models', 'userName', 'userSignature', 'emailLanguage'], (settings) => {
        const model = settings.defaultModel || 'gemini';
        const apiKey = settings.apiKeys ? settings.apiKeys[model] : request.apiKey;
        const customModelId = settings.models ? settings.models[model] : null;

        const provider = LLMFactory.getProvider(model);

        if (request.action === "analyze") {
            provider.analyzeWebsite(request.data, apiKey, customModelId)
                .then(res => {
                    res.modelUsed = model;
                    sendResponse(res);
                })
                .catch(error => sendResponse({ error: error.message }));
        } else if (request.action === "generateEmail") {
            provider.generateEmail(request.data, apiKey, customModelId)
                .then(sendResponse)
                .catch(error => sendResponse({ error: error.message }));
        } else if (request.action === "startAutonomous") {
            AutonomousService.start(request.urls, settings);
            sendResponse({ success: true });
        } else if (request.action === "stopAutonomous") {
            AutonomousService.stop();
            sendResponse({ success: true });
        } else if (request.action === "getAutonomousStatus") {
            sendResponse(AutonomousService.getStatus());
        }
    });
    return true;
});
