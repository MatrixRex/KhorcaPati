
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function getFiles(dir) {
    let files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        if (item.isDirectory()) {
            if (item.name === 'node_modules' || item.name === '.git') continue;
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
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = tRegex.exec(content)) !== null) {
        keysInCode.add(match[1]);
    }
}

// console.log('Keys used in code:', Array.from(keysInCode).sort());

// Extract keys from i18n.ts
const i18nPath = path.join(srcDir, 'i18n.ts');
const i18nContent = fs.readFileSync(i18nPath, 'utf8');

// Use a simple regex to find keys in the en translation block
const enBlockMatch = i18nContent.match(/en: \{[\s\S]+?translation: \{([\s\S]+?)\}/);
const keysInI18n = new Set();
if (enBlockMatch) {
    const enBlock = enBlockMatch[1];
    const keyRegex = /"([^"]+)"\s*:/g;
    let match;
    while ((match = keyRegex.exec(enBlock)) !== null) {
        keysInI18n.add(match[1]);
    }
}

console.log('\nMissing keys (used in code but not in i18n.ts):');
const missing = [];
for (const key of keysInCode) {
    if (!keysInI18n.has(key)) {
        missing.push(key);
    }
}
console.log(missing.sort());

console.log('\nUnused keys (in i18n.ts but not used in code):');
const unused = [];
for (const key of keysInI18n) {
    if (!keysInCode.has(key)) {
        unused.push(key);
    }
}
console.log(unused.sort());
