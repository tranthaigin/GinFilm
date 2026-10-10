const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'features/user/pages');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Normalize font
      content = content.replace(/font-\['Inter'\]/g, "font-sans");
      content = content.replace(/style=\{\{\s*fontFamily:\s*"'DM Sans', sans-serif"\s*\}\}/g, "");
      
      // We will make all base text white by replacing text-[#f5f5f5], text-[#f1f1f1], text-gray-300, text-text-strong with text-white
      // But only on the main container which usually has min-h-screen
      content = content.replace(/className="([^"]*)min-h-screen([^"]*)"/g, (match, p1, p2) => {
         let newClasses = p1 + "min-h-screen" + p2;
         // remove existing text-* colors and font-*
         newClasses = newClasses.replace(/\btext-\[\#[a-fA-F0-9]+\]\b/g, '');
         newClasses = newClasses.replace(/\btext-white\b/g, '');
         newClasses = newClasses.replace(/\btext-gray-300\b/g, '');
         newClasses = newClasses.replace(/\btext-text-strong\b/g, '');
         newClasses = newClasses.replace(/\bfont-\['Inter'\]\b/g, '');
         newClasses = newClasses.replace(/\bfont-sans\b/g, '');
         
         // clean up extra spaces
         newClasses = newClasses.replace(/\s+/g, ' ').trim();
         
         // add back text-white and font-sans
         newClasses += " text-[#F1F1F1] font-sans";
         
         return `className="${newClasses}"`;
      });
      
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

processDir(pagesDir);
console.log('Done normalizing fonts and colors in pages');
