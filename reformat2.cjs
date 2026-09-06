const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf-8');

// Restore proper newlines more carefully
// Split on > followed by < (JSX boundaries) and ; followed by non-space
c = c
  // Newline after semicolons that are followed by content
  .replace(/;(\s*)([A-Za-z])/g, ';\n$2')
  // Newline between closing and opening JSX tags
  .replace(/>(\s*)</g, '>\n<')
  // Newline after closing brace followed by content
  .replace(/}(\s*)([A-Za-z])/g, '}\n$2')
  // Newline after closing paren followed by =>
  .replace(/\)(\s*)=>/g, ') =>')
  // Fix: ensure return ( is on its own
  .replace(/return\s*\(/g, 'return (\n');

fs.writeFileSync('src/app/page.tsx', c);
console.log('Lines:', c.split('\n').length);