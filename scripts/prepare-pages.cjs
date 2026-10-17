// Create a Pages-ready copy without editing the checked-in website.
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'main-files');
const dest = path.join(root, 'pages-dist');
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(source, dest, { recursive: true });
fs.writeFileSync(path.join(dest, '.nojekyll'), '', 'utf8');

const replacements = [
  ['https://github.com/Sanskar-in', 'https://github.com/sanskarIN'],
  ['https://github.com/Sanskar-in/SpeedPulse', 'https://github.com/sanskarIN/SpeedPulse'],
  ['https://x.com/Sanskar_in', 'https://x.com/SanskarCodes'],
  ['https://x.com/@SanskarCode', 'https://x.com/SanskarCodes'],
  ['https://www.linkedin.com/in/sanskar-in/', 'https://linkedin.com/in/SanskarCodes'],
  ['https://ramsandesh.gumroad.com', 'https://buymeacoffee.com/SanskarCodes'],
  ['aria-label="Gumroad E-books"', 'aria-label="Buy Me a Coffee"']
];

for (const name of fs.readdirSync(dest)) {
  if (!name.endsWith('.html')) continue;
  const file = path.join(dest, name);
  let html = fs.readFileSync(file, 'utf8');
  for (const [before, after] of replacements) html = html.replaceAll(before, after);
  // The large generated Developer Labs file cannot be maintained as a
  // separate mail/contact directory; use one canonical contact link.
  html = html.replace(/<a\b[^>]*href=["']mailto:[^"']+["'][^>]*>[\s\S]*?<\/a>/gi,
    '<a href="https://sanskarin.github.io/contact">Contact the maintainer</a>');
  fs.writeFileSync(file, html, 'utf8');
}
console.log('Prepared GitHub Pages artifact:', dest);
