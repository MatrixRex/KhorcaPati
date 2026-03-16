
import fs from 'fs';
import path from 'path';

const srcDir = 'h:/web/07-KhorchaPati/KhorcaPati/src';
const i18nPath = path.join(srcDir, 'i18n.ts');
const i18nContent = fs.readFileSync(i18nPath, 'utf8');

function extractKeysFromBlock(content, blockName) {
    const startRegex = new RegExp(`${blockName}: \\{`);
    const startMatch = content.match(startRegex);
    if (!startMatch) return new Set();
    
    let startIndex = startMatch.index;
    let balance = 0;
    let endIndex = -1;
    
    // Find the end of the block by balancing braces
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

console.log('EN Keys Count:', enKeys.size);
console.log('BN Keys Count:', bnKeys.size);

console.log('\n--- In BN but NOT in EN ---');
const bnOnly = [];
for (const key of bnKeys) {
    if (!enKeys.has(key)) bnOnly.push(key);
}
console.log(bnOnly.sort());

console.log('\n--- In EN but NOT in BN ---');
const enOnly = [];
for (const key of enKeys) {
    if (!bnKeys.has(key)) enOnly.push(key);
}
console.log(enOnly.sort());
