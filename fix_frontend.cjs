const fs = require('fs');
const path = 'd:/xampp/htdocs/DeveloperEv/DEV-Frontend/src/pages/tools/planner-page.tsx';
let content = fs.readFileSync(path, 'utf8');

// The corrupted symbol is "â±", let's just replace all instances of "â±" and other garbled text with proper emojis.
content = content.replace(/â±\?/g, '⏱️');
content = content.replace(/â±/g, '⏱️');
content = content.replace(/\?/g, '⏱️');
content = content.replace(/>30 s/g, '>120 s');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed symbols and text in frontend');
