
import fs from 'fs';
import path from 'path';

function getFiles(dir) {
    let files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        if (item.isDirectory()) {
            if (item.name === 'node_modules' || item.name === '.git' || item.name === 'dist') continue;
            files = [...files, ...getFiles(path.join(dir, item.name))];
        } else {
            files.push(path.join(dir, item.name));
        }
    }
    return files;
}

const srcDir = 'h:/web/07-KhorchaPati/KhorcaPati/src';
const allFiles = getFiles(srcDir);

const keysInCode = new Set();
const tRegex = /t\(['"]([a-zA-Z0-9_]+)['"]\)/g;

for (const file of allFiles) {
    if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
    if (file.includes('i18n.ts')) continue;
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = tRegex.exec(content)) !== null) {
        keysInCode.add(match[1]);
    }
}

const i18nPath = path.join(srcDir, 'i18n.ts');
const i18nContent = fs.readFileSync(i18nPath, 'utf8');

function extractKeysFromBlock(content, blockName) {
    const startRegex = new RegExp(`${blockName}: \\{`);
    const startMatch = content.match(startRegex);
    if (!startMatch) return new Set();
    
    let startIndex = startMatch.index;
    let balance = 0;
    let endIndex = -1;
    
    for (let i = startIndex; i < content.length; i++) {
        if (content[i] === '{') balance++;
        else if (content[i] === '}') {
            balance--;
            if (balance === 0) {
                endIndex = i;
                break;
            }
        }
    }
    
    if (endIndex === -1) return new Set();
    
    const block = content.substring(startIndex, endIndex);
    const keys = new Set();
    const keyRegex = /"([^"]+)"\s*:/g;
    let match;
    while ((match = keyRegex.exec(block)) !== null) {
        keys.add(match[1]);
    }
    return keys;
}

const enKeys = extractKeysFromBlock(i18nContent, 'en');
const bnKeys = extractKeysFromBlock(i18nContent, 'bn');

const IGNORE = new Set(['0', 'a', 'T', 'apple', 'array', 'id', 'name', 'qty', 'unit', 'expense']); // 'expense' might be a false positive if used as a variable or something, but let's see.

console.log('--- Missing in EN (used in code) ---');
for (const key of keysInCode) {
    if (!enKeys.has(key) && !IGNORE.has(key)) console.log(key);
}

console.log('\n--- Missing in BN (used in code) ---');
for (const key of keysInCode) {
    if (!bnKeys.has(key) && !IGNORE.has(key)) console.log(key);
}
