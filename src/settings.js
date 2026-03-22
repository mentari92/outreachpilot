/**
 * settings.js - Save/Load preferences for multi-LLM support
 */

const PROVIDER_FETCH = {
    gemini: async (key) => {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!res.ok) throw new Error((await res.json()).error?.message || res.statusText);
        const data = await res.json();
        return (data.models || []).map(m => m.name.replace('models/', '')).filter(n => n.startsWith('gemini'));
    },
    openai: async (key) => {
        const res = await fetch('https://api.openai.com/v1/models', { headers: { 'Authorization': `Bearer ${key}` } });
        if (!res.ok) throw new Error((await res.json()).error?.message || res.statusText);
        const data = await res.json();
        return (data.data || []).map(m => m.id).filter(id => /^(gpt|o\d|chatgpt)/.test(id)).sort();
    },
    claude: async (key) => {
        const res = await fetch('https://api.anthropic.com/v1/models', {
            headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' }
        });
        if (!res.ok) throw new Error((await res.json()).error?.message || res.statusText);
        const data = await res.json();
        return (data.data || []).map(m => m.id);
    },
    grok: async (key) => {
        const res = await fetch('https://api.x.ai/v1/models', { headers: { 'Authorization': `Bearer ${key}` } });
        if (!res.ok) throw new Error((await res.json()).error?.message || res.statusText);
        const data = await res.json();
        return (data.data || []).map(m => m.id);
    },
    openrouter: async (key) => {
        const res = await fetch('https://openrouter.ai/api/v1/models', { headers: { 'Authorization': `Bearer ${key}` } });
        if (!res.ok) throw new Error((await res.json()).error?.message || res.statusText);
        const data = await res.json();
        return (data.data || []).map(m => m.id).sort();
    },
    groq: async (key) => {
        const res = await fetch('https://api.groq.com/openai/v1/models', { headers: { 'Authorization': `Bearer ${key}` } });
        if (!res.ok) throw new Error((await res.json()).error?.message || res.statusText);
        const data = await res.json();
        return (data.data || []).map(m => m.id).filter(id => /llama|mixtral|gemma|whisper/i.test(id)).sort();
    },
    deepseek: async (key) => {
        const res = await fetch('https://api.deepseek.com/models', { headers: { 'Authorization': `Bearer ${key}` } });
        if (!res.ok) throw new Error((await res.json()).error?.message || res.statusText);
        const data = await res.json();
        return (data.data || []).map(m => m.id);
    },
    straico: async (key) => {
        const res = await fetch('https://api.straico.com/v0/models', { headers: { 'Authorization': `Bearer ${key}` } });
        if (!res.ok) throw new Error((await res.json()).error?.message || res.statusText);
        const data = await res.json();
        const list = Array.isArray(data.data) ? data.data : Object.values(data.data || {}).flat();
        return list.map(m => m.model || m.name || m.id).filter(Boolean).sort();
    }
};

document.querySelectorAll('button[data-provider]').forEach(btn => {
    btn.addEventListener('click', async () => {
        const provider = btn.dataset.provider;
        const apiKey = document.getElementById(`${provider}-key`).value.trim();
        const status = document.getElementById(`${provider}-model-status`);

        if (!apiKey) {
            status.textContent = `⚠️ Please enter your ${provider} API Key first.`;
            return;
        }
        if (!PROVIDER_FETCH[provider]) {
            status.textContent = '⚠️ This provider does not support automatic model fetching.';
            return;
        }

        btn.textContent = 'Loading...';
        btn.disabled = true;
        status.textContent = '';

        try {
            const models = await PROVIDER_FETCH[provider](apiKey);
            // Gap 4: use createElement instead of innerHTML to prevent XSS from API-returned model names
            const datalist = document.getElementById(`${provider}-model-list`);
            datalist.replaceChildren(...models.map(m => {
                const opt = document.createElement('option');
                opt.value = m;
                return opt;
            }));
            status.textContent = `✅ ${models.length} models found. Click the field above to select.`;
        } catch (e) {
            status.textContent = `❌ Failed: ${e.message}`;
        } finally {
            btn.textContent = 'Fetch Models';
            btn.disabled = false;
        }
    });
});

const API_KEY_PROVIDERS = ['gemini','openai','claude','grok','groq','openrouter','deepseek','huggingface','straico','hunterio'];

// Gap 6: Save — load existing keys first, only overwrite fields the user typed into
document.getElementById('save').addEventListener('click', () => {
    chrome.storage.local.get('apiKeys', ({ apiKeys: existing = {} }) => {
        const newKeys = { ...existing };
        API_KEY_PROVIDERS.forEach(p => {
            const val = document.getElementById(`${p}-key`)?.value.trim();
            if (val) newKeys[p] = val; // only overwrite if user typed a new value
        });

        const settings = {
            defaultModel: document.getElementById('default-model').value,
            apiKeys: newKeys,
            models: {
                gemini: document.getElementById('gemini-model').value,
                openai: document.getElementById('openai-model').value,
                claude: document.getElementById('claude-model').value,
                grok: document.getElementById('grok-model').value,
                groq: document.getElementById('groq-model').value,
                openrouter: document.getElementById('openrouter-model').value,
                deepseek: document.getElementById('deepseek-model').value,
                huggingface: document.getElementById('huggingface-model').value,
                straico: document.getElementById('straico-model').value
            },
            userName: document.getElementById('user-name').value,
            userSignature: document.getElementById('user-signature').value,
            emailLanguage: document.getElementById('email-language').value.trim(),
            targetUrl: document.getElementById('target-url').value,
            targetDescription: document.getElementById('target-description').value,
            batchDelayMs: parseInt(document.getElementById('batch-delay').value) || 2000,
            googleSheetsId: document.getElementById('google-sheets-id').value.trim()
        };

        // Gap 1: store in local (not sync) to keep API keys on-device
        chrome.storage.local.set(settings, () => {
            const btn = document.getElementById('save');
            btn.textContent = '✅ Settings Saved!';
            btn.style.background = '#00c4cc';
            setTimeout(() => { btn.textContent = 'Save All Settings'; btn.style.background = ''; }, 2000);
        });
    });
});

function loadSettings() {
    // Gap 1: read from local storage
    chrome.storage.local.get(['defaultModel', 'apiKeys', 'models', 'userName', 'userSignature', 'emailLanguage', 'targetUrl', 'targetDescription', 'batchDelayMs', 'googleSheetsId'], (data) => {
        if (data.defaultModel) document.getElementById('default-model').value = data.defaultModel;

        // Gap 6: never populate API key fields with actual values — show placeholder instead
        if (data.apiKeys) {
            API_KEY_PROVIDERS.forEach(p => {
                const el = document.getElementById(`${p}-key`);
                if (el && data.apiKeys[p]) {
                    el.value = '';
                    el.placeholder = '(saved — leave blank to keep)';
                }
            });
        }

        if (data.models) {
            document.getElementById('gemini-model').value = data.models.gemini || '';
            document.getElementById('openai-model').value = data.models.openai || '';
            document.getElementById('claude-model').value = data.models.claude || '';
            document.getElementById('grok-model').value = data.models.grok || '';
            document.getElementById('groq-model').value = data.models.groq || '';
            document.getElementById('openrouter-model').value = data.models.openrouter || '';
            document.getElementById('deepseek-model').value = data.models.deepseek || '';
            document.getElementById('huggingface-model').value = data.models.huggingface || '';
            document.getElementById('straico-model').value = data.models.straico || '';
        }

        if (data.userName) document.getElementById('user-name').value = data.userName;
        if (data.userSignature) document.getElementById('user-signature').value = data.userSignature;
        if (data.emailLanguage) document.getElementById('email-language').value = data.emailLanguage;
        if (data.targetUrl) document.getElementById('target-url').value = data.targetUrl;
        if (data.targetDescription) document.getElementById('target-description').value = data.targetDescription;
        if (data.batchDelayMs) document.getElementById('batch-delay').value = data.batchDelayMs;
        if (data.googleSheetsId) document.getElementById('google-sheets-id').value = data.googleSheetsId;
    });
}

// Gap 1: one-time migration from storage.sync to storage.local
chrome.storage.local.get('apiKeys', (local) => {
    if (!local.apiKeys) {
        chrome.storage.sync.get(null, (synced) => {
            if (synced && Object.keys(synced).length > 0) {
                chrome.storage.local.set(synced, () => {
                    chrome.storage.sync.clear();
                    loadSettings();
                });
                return;
            }
            loadSettings();
        });
    } else {
        loadSettings();
    }
});
