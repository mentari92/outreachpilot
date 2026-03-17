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
    deepseek: async (key) => {
        const res = await fetch('https://api.deepseek.com/models', { headers: { 'Authorization': `Bearer ${key}` } });
        if (!res.ok) throw new Error((await res.json()).error?.message || res.statusText);
        const data = await res.json();
        return (data.data || []).map(m => m.id);
    },
    straico: async (key) => {
        const res = await fetch('https://api.straico.com/v1/model', { headers: { 'Authorization': `Bearer ${key}` } });
        if (!res.ok) throw new Error((await res.json()).error?.message || res.statusText);
        const data = await res.json();
        return (data.data || []).map(m => m.name || m.model || m.id).filter(Boolean).sort();
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
            const datalist = document.getElementById(`${provider}-model-list`);
            datalist.innerHTML = models.map(m => `<option value="${m}">`).join('');
            status.textContent = `✅ ${models.length} models found. Click the field above to select.`;
        } catch (e) {
            status.textContent = `❌ Failed: ${e.message}`;
        } finally {
            btn.textContent = 'Fetch Models';
            btn.disabled = false;
        }
    });
});

document.getElementById('save').addEventListener('click', () => {
    const settings = {
        defaultModel: document.getElementById('default-model').value,
        apiKeys: {
            gemini: document.getElementById('gemini-key').value,
            openai: document.getElementById('openai-key').value,
            claude: document.getElementById('claude-key').value,
            grok: document.getElementById('grok-key').value,
            openrouter: document.getElementById('openrouter-key').value,
            deepseek: document.getElementById('deepseek-key').value,
            huggingface: document.getElementById('huggingface-key').value,
            straico: document.getElementById('straico-key').value
        },
        models: {
            gemini: document.getElementById('gemini-model').value,
            openai: document.getElementById('openai-model').value,
            claude: document.getElementById('claude-model').value,
            grok: document.getElementById('grok-model').value,
            openrouter: document.getElementById('openrouter-model').value,
            deepseek: document.getElementById('deepseek-model').value,
            huggingface: document.getElementById('huggingface-model').value,
            straico: document.getElementById('straico-model').value
        },
        userName: document.getElementById('user-name').value,
        userSignature: document.getElementById('user-signature').value,
        emailLanguage: document.getElementById('email-language').value
    };

    chrome.storage.sync.set(settings, () => {
        const btn = document.getElementById('save');
        btn.textContent = '✅ Settings Saved!';
        btn.style.background = '#00c4cc';
        setTimeout(() => { btn.textContent = 'Save All Settings'; btn.style.background = ''; }, 2000);
    });
});

chrome.storage.sync.get(['defaultModel', 'apiKeys', 'models', 'userName', 'userSignature', 'emailLanguage'], (data) => {
    if (data.defaultModel) document.getElementById('default-model').value = data.defaultModel;

    if (data.apiKeys) {
        document.getElementById('gemini-key').value = data.apiKeys.gemini || '';
        document.getElementById('openai-key').value = data.apiKeys.openai || '';
        document.getElementById('claude-key').value = data.apiKeys.claude || '';
        document.getElementById('grok-key').value = data.apiKeys.grok || '';
        document.getElementById('openrouter-key').value = data.apiKeys.openrouter || '';
        document.getElementById('deepseek-key').value = data.apiKeys.deepseek || '';
        document.getElementById('huggingface-key').value = data.apiKeys.huggingface || '';
        document.getElementById('straico-key').value = data.apiKeys.straico || '';
    }

    if (data.models) {
        document.getElementById('gemini-model').value = data.models.gemini || '';
        document.getElementById('openai-model').value = data.models.openai || '';
        document.getElementById('claude-model').value = data.models.claude || '';
        document.getElementById('grok-model').value = data.models.grok || '';
        document.getElementById('openrouter-model').value = data.models.openrouter || '';
        document.getElementById('deepseek-model').value = data.models.deepseek || '';
        document.getElementById('huggingface-model').value = data.models.huggingface || '';
        document.getElementById('straico-model').value = data.models.straico || '';
    }

    if (data.userName) document.getElementById('user-name').value = data.userName;
    if (data.userSignature) document.getElementById('user-signature').value = data.userSignature;
    if (data.emailLanguage) document.getElementById('email-language').value = data.emailLanguage;
});
