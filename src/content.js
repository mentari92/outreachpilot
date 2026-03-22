/**
 * content.js - Scrapes page content and contact info
 */

function scrapePage() {
    const title = document.title;
    const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
    const bodyText = document.body.innerText.substring(0, 2000);
    const outboundLinks = Array.from(document.querySelectorAll('a[href^="http"]'))
        .filter(a => !a.href.includes(window.location.hostname)).length;

    // Global author detection (Metadata & Semantic HTML)
    const authorMeta = document.querySelector('meta[name="author"]')?.content ||
        document.querySelector('[itemprop="author"]')?.innerText ||
        document.querySelector('[rel="author"]')?.innerText || '';

    const hasAuthor = !!(authorMeta ||
        document.querySelector('.author') ||
        document.querySelector('.byline') ||
        document.querySelector('.entry-author') ||
        /written by|oleh|par|escrito por|von|skrevet af|kirjoittanut/i.test(document.body.innerText.substring(0, 5000))
    );

    // Contact extraction
    const emails = Array.from(new Set(
        document.body.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
    ));

    const whatsapp = Array.from(new Set(
        Array.from(document.querySelectorAll('a[href*="wa.me"]')).map(a => a.href)
    ));

    const socialProfiles = {
        instagram: document.querySelector('a[href*="instagram.com"]')?.href || null,
        linkedin: document.querySelector('a[href*="linkedin.com"]')?.href || null,
        twitter: document.querySelector('a[href*="twitter.com"]')?.href ||
            document.querySelector('a[href*="x.com"]')?.href || null,
        facebook: document.querySelector('a[href*="facebook.com"]')?.href || null,
        tiktok: document.querySelector('a[href*="tiktok.com"]')?.href || null
    };

    const footerText = document.querySelector('footer')?.innerText.substring(0, 500) || '';
    const navText = document.querySelector('nav')?.innerText.substring(0, 500) || '';

    // Detect "Write for Us" or Guest Post pages (Universal Patterns)
    const hasGuestPostPage = !!Array.from(document.querySelectorAll('a')).find(a =>
        /write for us|guest post|contribute|submit|artikel tamu|escribe|proposer|artikel einreichen|guest-post|write-for-us/i.test(a.innerText) ||
        /write-for-us|guest-post|contribute|submit-article|kerjasama|advertising/i.test(a.href)
    );

    return {
        title,
        metaDescription,
        bodyText,
        footerText,
        navText,
        outboundLinks,
        hasAuthor,
        hasGuestPostPage,
        emails,
        whatsapp,
        socialProfiles
    };
}

function extractEmails(text) {
    // Normal email regex
    const standardEmails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    // Obfuscated email regex (e.g. name [at] domain.com)
    const obfuscatedEmails = (text.match(/[a-zA-Z0-9._%+-]+\s*[\[\(]\s*at\s*[\]\)]\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi) || [])
        .map(e => e.replace(/\s*[\[\(]\s*at\s*[\]\)]\s*/i, '@'));

    return Array.from(new Set([...standardEmails, ...obfuscatedEmails]));
}

function extractWhatsApp(text, htmlContent) {
    const waNumbers = [];

    // 1. Search for wa.me or api.whatsapp.com links in HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const links = Array.from(doc.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp.com/send"]'));
    links.forEach(link => {
        const match = link.href.match(/(?:phone|send\?phone=)(\d+)/) || link.href.match(/wa\.me\/(\d+)/);
        if (match) waNumbers.push(match[1]);
    });

    // 2. Indonesian WhatsApp patterns (e.g. 0812... or +62812...)
    const idMatches = text.match(/(?:\+62|62|0)8[1-9][0-9]{7,11}/g) || [];
    idMatches.forEach(num => {
        let clean = num.replace(/\D/g, '');
        if (clean.startsWith('0')) clean = '62' + clean.substring(1);
        if (clean.length >= 10 && clean.length <= 15) waNumbers.push(clean);
    });

    // 3. Generic E.164 international numbers (e.g. +44..., +1..., +81...)
    const intlMatches = text.match(/\+[1-9]\d{6,14}/g) || [];
    intlMatches.forEach(num => {
        const clean = num.replace(/\D/g, '');
        if (clean.length >= 7 && clean.length <= 15) waNumbers.push(clean);
    });

    return Array.from(new Set(waNumbers));
}

async function findContactPages() {
    // Strategy: Look for universal URL fragments that web developers use worldwide
    const universalFragments = /contact|about|redak|info|impressum|imprint|legal|kontakt|tulis|hubungi|contacto|acerca|propos|chi-siamo|contato|over/i;

    const contactLinks = Array.from(new Set(
        Array.from(document.querySelectorAll('a'))
            .filter(a =>
                universalFragments.test(a.innerText) ||
                universalFragments.test(a.href)
            )
            .map(a => a.href)
            .filter(href => href.startsWith('http'))
            .slice(0, 5)
    ));

    if (contactLinks.length === 0) return { emails: [], whatsapp: [] };

    // Delegate fetching to background.js to avoid CORS restrictions in content script context
    return new Promise(resolve => {
        chrome.runtime.sendMessage({ action: "fetchContactPages", urls: contactLinks }, (result) => {
            resolve(result || { emails: [], whatsapp: [] });
        });
    });
}

async function scrapePageWithDeepScan() {
    const baseData = scrapePage();
    // Also perform text-based scanning on the current page for WA
    const initialWA = extractWhatsApp(document.body.innerText, document.documentElement.outerHTML);

    const deepResults = await findContactPages();

    // Merge and Deduplicate
    baseData.emails = Array.from(new Set([...baseData.emails, ...deepResults.emails]));
    baseData.whatsapp = Array.from(new Set([...baseData.whatsapp, ...initialWA, ...deepResults.whatsapp]));

    return baseData;
}

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrape") {
        scrapePageWithDeepScan().then(sendResponse);
    }
    return true;
});
