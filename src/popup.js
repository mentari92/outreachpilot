/**
 * popup.js - Orchestration and UI logic with Multi-LLM support
 */

class StorageManager {
    static async getSettings() {
        // Gap 1: read from local storage (API keys must not sync to Google servers)
        return await chrome.storage.local.get(['defaultModel', 'apiKeys', 'userName', 'userSignature', 'geminiKey', 'emailLanguage', 'targetUrl', 'targetDescription', 'batchDelayMs']);
    }

    static getActiveKey(settings) {
        const model = settings.defaultModel || 'gemini';
        if (settings.apiKeys && settings.apiKeys[model]) {
            return settings.apiKeys[model];
        }
        return settings.geminiKey; // Fallback
    }

    static getActiveModelName(settings) {
        const model = settings.defaultModel || 'gemini';
        const names = {
            gemini: 'Gemini',
            openai: 'OpenAI',
            claude: 'Claude',
            groq: 'Groq',
            openrouter: 'OpenRouter',
            deepseek: 'DeepSeek'
        };
        return names[model] || 'AI';
    }
}

class UIBuilder {
    static clearElement(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    static createElement(tag, className, textContent = '') {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (textContent) el.textContent = textContent;
        return el;
    }

    static showStatus(containerId, message, isError = false, showSpinner = false) {
        const container = document.getElementById(containerId);
        if (!container) return;
        this.clearElement(container);

        const textObj = this.createElement('p', '', message);
        if (isError) textObj.style.color = 'var(--danger)';
        container.appendChild(textObj);

        if (showSpinner) {
            container.appendChild(this.createElement('div', 'spinner'));
        }
    }

    static showSettingsPrompt(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        this.clearElement(container);

        container.appendChild(this.createElement('p', '', '⚠️ Please configure your API Key in Settings first.'));
        const btn = this.createElement('button', 'primary-btn', 'Open Settings');
        btn.id = 'go-to-settings';
        btn.onclick = () => chrome.runtime.openOptionsPage();
        container.appendChild(btn);
    }

    static renderAIResult(containerId, res, scrape, onGenerateEmail) {
        const container = document.getElementById(containerId);
        if (!container) return;
        this.clearElement(container);

        const statusClass = res.isPBN ? 'pbn' : (res.overallScore < 60 ? 'low' : 'pass');
        const card = this.createElement('div', `result-card ${statusClass}`);

        const titleText = res.isPBN ? '❌ PBN DETECTED' : (res.overallScore < 60 ? '⚠️ LOW QUALITY' : '✅ RECOMMENDED');
        card.appendChild(this.createElement('h3', '', titleText));

        const scoreBadge = this.createElement('div', 'score-badge', res.overallScore.toString());
        const scoreMax = this.createElement('span', '', '/100');
        scoreBadge.appendChild(scoreMax);
        card.appendChild(scoreBadge);

        card.appendChild(this.createElement('p', 'summary', res.summary));

        const statsDiv = this.createElement('div', 'stats');
        const labels = ['Quality:', 'Relevance:', 'Trust:'];
        const values = [res.contentQuality, res.nicheRelevance, res.siteTrust || res.outreachViability];

        labels.forEach((label, i) => {
            const stat = this.createElement('div', 'stat', ` ${values[i]}`);
            const span = this.createElement('span', '', label);
            stat.prepend(span);
            statsDiv.appendChild(stat);
        });
        card.appendChild(statsDiv);

        if (res.isPBN) {
            const reasons = this.createElement('div', 'reasons', ` ${res.pbnReasons.join(', ')}`);
            const strong = this.createElement('strong', '', 'Reasons:');
            reasons.prepend(strong);
            card.appendChild(reasons);
        }

        const contactsDiv = this.createElement('div', 'contacts');
        contactsDiv.appendChild(this.createElement('h4', '', 'Contacts Found:'));
        const emailsP = this.createElement('p', '');
        emailsP.appendChild(document.createTextNode('📧 '));
        if (scrape.emails && scrape.emails.length > 0) {
            scrape.emails.forEach((email, i) => {
                const a = document.createElement('a');
                a.href = `mailto:${email}`;
                a.textContent = email;
                a.style.cssText = 'color:var(--primary);text-decoration:none;';
                emailsP.appendChild(a);
                if (i < scrape.emails.length - 1) emailsP.appendChild(document.createTextNode(', '));
            });
        } else {
            emailsP.appendChild(document.createTextNode('None found'));
        }
        contactsDiv.appendChild(emailsP);

        const emailAreaDiv = this.createElement('div');
        emailAreaDiv.id = 'email-area';

        if (res.overallScore >= 60) {
            const emailBtn = this.createElement('button', 'primary-btn', 'Generate Outreach Email');
            emailBtn.id = 'gen-email';
            emailBtn.onclick = () => onGenerateEmail(res);
            emailAreaDiv.appendChild(emailBtn);
        }

        contactsDiv.appendChild(emailAreaDiv);
        card.appendChild(contactsDiv);
        container.appendChild(card);
        container.appendChild(this.createElement('p', 'hint', 'AI insight powered by current default model.'));
    }

    static appendAgentResult(containerId, url, result, emailSequence) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const card = this.createElement('div', 'result-card');
        card.style.padding = '12px';
        card.style.fontSize = '0.9rem';
        card.style.marginBottom = '10px';
        card.style.borderLeft = result.error || result.isPBN ? '4px solid var(--danger)' : '4px solid var(--primary)';

        const header = this.createElement('strong', '', url.substring(0, 60) + (url.length > 60 ? '...' : ''));
        header.style.display = 'block';
        header.style.marginBottom = '5px';
        card.appendChild(header);

        if (result.error) {
            const errP = this.createElement('p', '', `Error: ${result.error}`);
            errP.style.color = 'var(--danger)';
            card.appendChild(errP);
        } else {
            const statusText = result.isPBN ? '❌ PBN Detected' : `Score: ${result.overallScore}/100`;
            card.appendChild(this.createElement('div', '', statusText));

            // Show discovered emails as mailto links
            if (result.emails && result.emails.length > 0) {
                const emailsP = this.createElement('p', '');
                emailsP.style.marginTop = '4px';
                emailsP.appendChild(document.createTextNode('📧 '));
                result.emails.forEach((email, i) => {
                    const a = document.createElement('a');
                    a.href = `mailto:${email}`;
                    a.textContent = email;
                    a.style.cssText = 'color:var(--primary);text-decoration:none;margin-right:4px;';
                    emailsP.appendChild(a);
                    const copyBtn = document.createElement('button');
                    copyBtn.textContent = '📋';
                    copyBtn.title = 'Copy email';
                    copyBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:0.8rem;padding:0 4px;';
                    copyBtn.onclick = () => navigator.clipboard.writeText(email);
                    emailsP.appendChild(copyBtn);
                    if (i < result.emails.length - 1) emailsP.appendChild(document.createTextNode(' '));
                });
                card.appendChild(emailsP);
            }

            // Show 3-email sequence as tabs
            if (emailSequence && emailSequence.length > 0) {
                const seqDiv = this.createElement('div', '');
                seqDiv.style.marginTop = '8px';

                const tabBar = this.createElement('div', '');
                tabBar.style.cssText = 'display:flex;gap:4px;margin-bottom:4px;';

                const emailPanels = [];
                const labels = ['Email 1 (Day 0)', 'Email 2 (Day 5-7)', 'Email 3 (Day 12-14)'];

                emailSequence.forEach((emailText, idx) => {
                    const tabBtn = this.createElement('button', '');
                    tabBtn.textContent = `#${idx + 1}`;
                    tabBtn.style.cssText = 'padding:2px 8px;font-size:0.75rem;border-radius:4px;border:1px solid var(--primary);cursor:pointer;background:' + (idx === 0 ? 'var(--primary)' : 'white') + ';color:' + (idx === 0 ? 'white' : 'var(--primary)') + ';';
                    tabBar.appendChild(tabBtn);

                    const panel = this.createElement('div', '');
                    panel.style.cssText = `display:${idx === 0 ? 'block' : 'none'};background:#f8fafc;border-radius:6px;padding:6px;font-size:0.78rem;white-space:pre-wrap;max-height:120px;overflow-y:auto;border:1px solid #e2e8f0;`;
                    panel.title = labels[idx];
                    panel.textContent = emailText || '(no email generated)';
                    emailPanels.push(panel);

                    tabBtn.onclick = () => {
                        emailPanels.forEach((p, i) => {
                            p.style.display = i === idx ? 'block' : 'none';
                            tabBar.children[i].style.background = i === idx ? 'var(--primary)' : 'white';
                            tabBar.children[i].style.color = i === idx ? 'white' : 'var(--primary)';
                        });
                    };
                });

                seqDiv.appendChild(tabBar);
                emailPanels.forEach(p => seqDiv.appendChild(p));
                card.appendChild(seqDiv);
            }
        }

        container.prepend(card);
    }

    static renderEmailDraft(containerId, emailSequence) {
        const container = document.getElementById(containerId);
        if (!container) return;
        this.clearElement(container);

        const emails = Array.isArray(emailSequence) ? emailSequence : [emailSequence];
        const labels = ['Email 1 — Day 0 (Initial Pitch)', 'Email 2 — Day 5-7 (Follow-up)', 'Email 3 — Day 12-14 (Final Check-in)'];

        const emailBox = this.createElement('div', 'email-box');

        // Tab bar
        const tabBar = this.createElement('div', '');
        tabBar.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;';
        const panels = [];

        emails.forEach((emailText, idx) => {
            const tabBtn = this.createElement('button', '');
            tabBtn.textContent = `Email ${idx + 1}`;
            tabBtn.style.cssText = 'padding:4px 10px;font-size:0.82rem;border-radius:6px;border:1px solid var(--primary);cursor:pointer;background:' + (idx === 0 ? 'var(--primary)' : 'white') + ';color:' + (idx === 0 ? 'white' : 'var(--primary)') + ';';
            tabBar.appendChild(tabBtn);

            const panel = this.createElement('div', '');
            panel.style.display = idx === 0 ? 'block' : 'none';

            const textarea = this.createElement('textarea', '');
            textarea.readOnly = true;
            textarea.value = emailText || '';
            textarea.title = labels[idx] || '';
            panel.appendChild(textarea);

            const copyBtn = this.createElement('button', 'secondary-btn', 'Copy to Clipboard');
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(emailText || '').then(() => {
                    const toast = panel.querySelector('.copy-toast');
                    if (toast) { toast.classList.remove('hidden'); setTimeout(() => toast.classList.add('hidden'), 2000); }
                });
            };
            panel.appendChild(copyBtn);

            const toast = this.createElement('div', 'hidden copy-toast', 'Copied!');
            panel.appendChild(toast);

            panels.push(panel);

            tabBtn.onclick = () => {
                panels.forEach((p, i) => {
                    p.style.display = i === idx ? 'block' : 'none';
                    tabBar.children[i].style.background = i === idx ? 'var(--primary)' : 'white';
                    tabBar.children[i].style.color = i === idx ? 'white' : 'var(--primary)';
                });
            };
        });

        if (emails.length > 1) emailBox.appendChild(tabBar);
        panels.forEach(p => emailBox.appendChild(p));

        container.appendChild(emailBox);
    }

    static downloadCSV(dataArray, filename = "outreachpilot-results.csv") {
        if (!dataArray || dataArray.length === 0) return;

        const headers = [
            "Date", "URL", "PBN Detected", "Overall Score", "Content Quality",
            "Niche Relevance", "Trust Score", "Emails", "WhatsApp",
            "Social Profiles", "Email_1", "Email_2", "Email_3", "Model Used"
        ];

        // Helper to escape CSV values properly
        const escapeCSV = (val) => {
            if (val === null || val === undefined) return '""';
            let str = String(val);
            // Replace double quotes with two double quotes
            str = str.replace(/"/g, '""');
            // Wrap everything in double quotes to handle commas, newlines, etc.
            return `"${str}"`;
        };

        const rows = dataArray.map(data => [
            escapeCSV(new Date().toLocaleString()),
            escapeCSV(data.url || ""),
            escapeCSV(data.isPBN ? "TRUE" : "FALSE"),
            escapeCSV(data.overallScore || 0),
            escapeCSV(data.contentQuality || 0),
            escapeCSV(data.nicheRelevance || 0),
            escapeCSV(data.siteTrust || data.outreachViability || 0),
            escapeCSV(data.emails ? data.emails.join(", ") : ""),
            escapeCSV(data.whatsapp ? data.whatsapp.join(", ") : ""),
            escapeCSV(data.socialProfiles ? Object.values(data.socialProfiles).filter(Boolean).join(", ") : ""),
            escapeCSV(data.Email_1 || data.emailDraft || ""),
            escapeCSV(data.Email_2 || ""),
            escapeCSV(data.Email_3 || ""),
            escapeCSV(data.modelUsed || "Unknown")
        ]);

        const csvContent = [
            "sep=,",
            headers.map(h => escapeCSV(h)).join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        // Add UTF-8 BOM (\ufeff) and the 'sep=,' instruction for Excel
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

class PopupController {
    constructor() {
        this.initEventListeners();
        this.startManualScan();

        // Check if agent is already running or has finished results
        chrome.runtime.sendMessage({ action: "getAutonomousStatus" }, (status) => {
            if (status && status.isRunning) {
                this.pollWaitId = setInterval(() => this.pollAutonomousStatus(), 1000);
                this.pollAutonomousStatus();
            } else if (status && status.results && status.results.length > 0) {
                // Render the results from previous run
                this.pollAutonomousStatus();
            }
        });

        // Gap 5: Check if a resume checkpoint exists
        chrome.runtime.sendMessage({ action: "checkCheckpoint" }, (info) => {
            if (info && info.hasCheckpoint) {
                const statusDiv = document.getElementById('agent-status');
                const runBtn = document.getElementById('run-agent');
                if (statusDiv) statusDiv.textContent = `🔖 Saved progress found: URL ${info.currentIdx}/${info.totalUrls}`;
                if (runBtn && runBtn.parentNode && !document.getElementById('resume-agent-btn')) {
                    const resumeBtn = UIBuilder.createElement('button', 'primary-btn', `▶ Resume from URL ${info.currentIdx}/${info.totalUrls}`);
                    resumeBtn.id = 'resume-agent-btn';
                    resumeBtn.style.marginTop = '6px';
                    resumeBtn.onclick = () => {
                        resumeBtn.remove();
                        chrome.runtime.sendMessage({ action: "resumeAutonomous", urls: info.urls, settings: {} });
                        if (!this.pollWaitId) {
                            this.pollWaitId = setInterval(() => this.pollAutonomousStatus(), 1000);
                        }
                    };
                    runBtn.parentNode.insertBefore(resumeBtn, runBtn.nextSibling);
                }
            }
        });
    }

    initEventListeners() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tab;
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(target).classList.add('active');

                if (target === 'manual') {
                    this.startManualScan();
                }
            });
        });

        document.getElementById('settings-btn').addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });

        document.getElementById('run-agent').addEventListener('click', () => {
            this.startAutonomousAgent();
        });

        // Re-run manual scan if user switches tabs
        chrome.tabs.onActivated.addListener(() => {
            const manualBtn = document.querySelector('.tab-btn[data-tab="manual"]');
            if (manualBtn && manualBtn.classList.contains('active')) {
                this.startManualScan();
            }
        });

        // Re-run manual scan if user refreshes the page
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.active) {
                const manualBtn = document.querySelector('.tab-btn[data-tab="manual"]');
                if (manualBtn && manualBtn.classList.contains('active')) {
                    this.startManualScan();
                }
            }
        });
    }

    async startAutonomousAgent() {
        const urlTextArea = document.getElementById('url-list');
        const statusDiv = document.getElementById('agent-status');
        const resultsDiv = document.getElementById('agent-results');

        const rawUrls = urlTextArea.value.split('\n').map(u => u.trim()).filter(u => {
            try { const p = new URL(u); return p.protocol === 'http:' || p.protocol === 'https:'; }
            catch { return false; }
        });
        const urls = [...new Set(rawUrls)];

        if (urls.length === 0) {
            statusDiv.textContent = 'Please enter at least one valid URL (starting with http/https).';
            return;
        }

        const settings = await StorageManager.getSettings();
        const activeKey = StorageManager.getActiveKey(settings);

        if (!activeKey) {
            statusDiv.textContent = '⚠️ Please configure your API Key in Settings first.';
            return;
        }

        chrome.runtime.sendMessage({ action: "startAutonomous", urls, settings });
        if (!this.pollWaitId) {
            this.pollWaitId = setInterval(() => this.pollAutonomousStatus(), 1000);
        }
        statusDiv.textContent = "Starting agent in background. You can safely close this tab.";
    }

    async pollAutonomousStatus() {
        const status = await new Promise(resolve => chrome.runtime.sendMessage({ action: "getAutonomousStatus" }, resolve));
        if (!status) return;

        const resultsDiv = document.getElementById('agent-results');
        const statusDiv = document.getElementById('agent-status');
        const runBtn = document.getElementById('run-agent');

        statusDiv.textContent = status.statusMessage || "Waiting for agent...";

        // Render newly added items only
        if (!this.lastUiResultsCount || this.lastUiResultsCount !== status.uiResults.length) {
            UIBuilder.clearElement(resultsDiv);
            status.uiResults.forEach(item => {
                UIBuilder.appendAgentResult('agent-results', item.url, item.aiResult || { error: item.error }, item.emailSequence || null);
            });
            this.lastUiResultsCount = status.uiResults.length;
        }

        if (status.isRunning) {
            runBtn.disabled = true;
            runBtn.textContent = 'Agent is Running. Safe to close tab.';
        } else {
            runBtn.disabled = false;
            runBtn.textContent = 'Run Agent';
            if (this.pollWaitId) {
                clearInterval(this.pollWaitId);
                this.pollWaitId = null;
            }
            if (status.results.length > 0 && !document.getElementById('dl-csv-bulk')) {
                const downloadBtn = UIBuilder.createElement('button', 'primary-btn', `📥 Download ${status.results.length} Results (CSV)`);
                downloadBtn.id = 'dl-csv-bulk';
                downloadBtn.style.marginTop = '15px';
                downloadBtn.onclick = () => UIBuilder.downloadCSV(status.results, `outreachpilot_batch_${new Date().getTime()}.csv`);
                resultsDiv.prepend(downloadBtn);
            }
        }
    }

    async startManualScan() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

            if (!tab || !tab.url.startsWith('http')) {
                UIBuilder.showStatus('scan-status', 'Please open a website to scan.', true);
                return;
            }

            const settings = await StorageManager.getSettings();
            const activeKey = StorageManager.getActiveKey(settings);
            const modelName = StorageManager.getActiveModelName(settings);

            if (!activeKey) {
                UIBuilder.showSettingsPrompt('scan-status');
                return;
            }

            // Scrape data
            UIBuilder.showStatus('scan-status', `${modelName} is analyzing the website...`, false, true);
            let scrapeData;
            try {
                scrapeData = await chrome.tabs.sendMessage(tab.id, { action: "scrape" });
            } catch (err) {
                if (err.message.includes('Receiving end does not exist')) {
                    throw new Error("Cannot connect to this page. Please REFRESH the page (F5) and try again.");
                }
                throw err;
            }

            // Analyze with AI
            const aiResult = await chrome.runtime.sendMessage({
                action: "analyze",
                data: scrapeData
            });

            if (aiResult.error) throw new Error(aiResult.error);

            // Show Results
            UIBuilder.renderAIResult('manual', aiResult, scrapeData, (res) => this.generateEmail(res, settings));

        } catch (error) {
            console.error("Scan failed:", error);
            const isAuthError = error.message.includes('401') ||
                error.message.toLowerCase().includes('token') ||
                error.message.toLowerCase().includes('not valid') ||
                error.message.toLowerCase().includes('unauthorized');
            if (isAuthError) {
                UIBuilder.showSettingsPrompt('scan-status');
            } else {
                UIBuilder.showStatus('scan-status', `Error: ${error.message}`, true);
            }
        }
    }

    async generateEmail(analysis, settings) {
        try {
            UIBuilder.showStatus('email-area', 'Drafting email sequence...', false, true);

            // Fetch fresh settings in case user changed language after scanning
            const freshSettings = await StorageManager.getSettings();

            const result = await chrome.runtime.sendMessage({
                action: "generateEmail",
                data: {
                    siteUrl: analysis.siteUrl || "",
                    title: analysis.summary,
                    summary: analysis.summary,
                    userName: freshSettings.userName || settings.userName,
                    userSignature: freshSettings.userSignature || settings.userSignature,
                    language: freshSettings.emailLanguage || "English"
                }
            });

            if (result.error) throw new Error(result.error);

            UIBuilder.renderEmailDraft('email-area', result.emailSequence || [result.email || ""]);

        } catch (error) {
            UIBuilder.showStatus('email-area', `Failed: ${error.message}`, true);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});
