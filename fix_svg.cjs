const fs = require('fs');
const path = 'd:/xampp/htdocs/DeveloperEv/DEV-Frontend/src/pages/tools/planner-page.tsx';
let content = fs.readFileSync(path, 'utf8');

let startIndex = content.indexOf('function getSvgIconForType(type: string)');
if (startIndex !== -1) {
  let endIndex = content.indexOf('return `<svg class="category-icon" style="color:#f43f5e"', startIndex);
  if (endIndex !== -1) {
    let block = content.substring(startIndex, endIndex);
    let newBlock = block.replace(/t === '([^']+)'/g, "t.includes('$1')");
    content = content.substring(0, startIndex) + newBlock + content.substring(endIndex);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Fixed getSvgIconForType');
  }
}
