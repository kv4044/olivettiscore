const fs = require('fs');

let contentPath = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\d458d404-cfd2-4876-a7e5-722619039d57\\.system_generated\\steps\\81\\content.md';

try {
  const content = fs.readFileSync(contentPath, 'utf8');
  const lines = content.split('\n');
  console.log(`Searching for keywords in ${contentPath}...`);
  lines.forEach((line, idx) => {
    const lower = line.toLowerCase();
    if (lower.includes('stats') || lower.includes('player') || lower.includes('scorer')) {
      console.log(`Line ${idx+1}: ${line.trim().substring(0, 200)}`);
    }
  });
} catch (err) {
  console.error(err);
}
