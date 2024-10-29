import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cache the banned words in memory
let bannedWords = [];

// Load banned words from JSON file
async function loadBannedWords() {
    try {
        const data = await fs.readFile(path.join(__dirname, '../config/bannedWords.json'), 'utf8');
        bannedWords = JSON.parse(data);
    } catch (error) {
        console.error('Error loading banned words:', error);
        bannedWords = []; // Fallback to empty array if file can't be loaded
    }
}

// Load words on startup
loadBannedWords();

// Censor words in content
export function censorContent(content) {
    let censoredContent = content;
    bannedWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        censoredContent = censoredContent.replace(regex, '*'.repeat(word.length));
    });
    return censoredContent;
}

// Check if content might be spam
export function isSpam(content) {

    const spamIndicators = [
        /(https?:\/\/[^\s]+)/g,  // URLs
        /\b(buy|sell|discount|offer)\b/gi,  // Commercial words
        /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,  // Email addresses
        /\b\d{10,}\b/g,  // Long numbers (like phone numbers)
        /(.)\1{4,}/g,  // Repeated characters
    ];

    // Count spam indicators
    let spamScore = 0;
    spamIndicators.forEach(indicator => {
        const matches = content.match(indicator) || [];
        spamScore += matches.length;
    });

    // Check for excessive caps
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.5 && content.length > 10) {
        spamScore += 1;
    }

    return spamScore >= 2;
}

// Middleware for content moderation
export function moderateContent(req, res, next) {
    if (!req.body.content) {
        return next();
    }

    // Check for spam
    if (isSpam(req.body.content)) {
        return res.status(400).json({ error: 'This content has been flagged as spam' });
    }

    // Censor banned words
    req.body.content = censorContent(req.body.content);

    // If there's a title, censor it too
    if (req.body.title) {
        req.body.title = censorContent(req.body.title);
    }

    next();
}
