
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
const tRegex = /t\(['"]([^'"]+)['"]\)/g;

for (const file of allFiles) {
    if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
    if (file.includes('i18n.ts')) continue;
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = tRegex.exec(content)) !== null) {
        keysInCode.add(match[1]);
    }
}

// Robust i18n key extraction
const i18nPath = path.join(srcDir, 'i18n.ts');
const i18nContent = fs.readFileSync(i18nPath, 'utf8');

const keysInEn = new Set();
const keysInBn = new Set();

// Extract EN keys
const enMatch = i18nContent.match(/en: \{[\s\S]+?translation: \{([\s\S]+?)\}/);
if (enMatch) {
    const block = enMatch[1];
    const keyRegex = /"([^"]+)"\s*:/g;
    let match;
    while ((match = keyRegex.exec(block)) !== null) {
        keysInEn.add(match[1]);
    }
}

// Extract BN keys
const bnMatch = i18nContent.match(/bn: \{[\s\S]+?translation: \{([\s\S]+?)\}/);
if (bnMatch) {
    const block = bnMatch[1];
    const keyRegex = /"([^"]+)"\s*:/g;
    let match;
    while ((match = keyRegex.exec(block)) !== null) {
        keysInBn.add(match[1]);
    }
}

console.log('--- Missing in EN ---');
const missingEn = [];
for (const key of keysInCode) {
    if (!keysInEn.has(key)) missingEn.push(key);
}
console.log(missingEn.sort());

console.log('\n--- Missing in BN ---');
const missingBn = [];
for (const key of keysInCode) {
    if (!keysInBn.has(key)) missingBn.push(key);
}
console.log(missingBn.sort());

console.log('\n--- In EN but not in BN ---');
const enOnly = [];
for (const key of keysInEn) {
    if (!keysInBn.has(key)) enOnly.push(key);
}
console.log(enOnly.sort());

console.log('\n--- In BN but not in EN ---');
const bnOnly = [];
for (const key of keysInBn) {
    if (!keysInEn.has(key)) bnOnly.push(key);
}
console.log(bnOnly.sort());
