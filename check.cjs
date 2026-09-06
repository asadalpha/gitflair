const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf-8');
let opens = (c.match(/{/g) || []).length;
let closes = (c.match(/}/g) || []).length;
console.log('Open braces:', opens, 'Close braces:', closes, 'Diff:', opens - closes);

// Find the error location - look for }, [userId]); which was line 72
let lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('}, [userId]')) {
    console.log('Line', i + 1, ':', lines[i].substring(0, 100));
    // Show surrounding context
    for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 3); j++) {
      console.log(j + 1, '|', lines[j].substring(0, 120));
    }
    break;
  }
}