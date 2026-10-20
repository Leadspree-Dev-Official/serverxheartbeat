import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '../apps/web/dist');
const targetFile = path.join(__dirname, '../apps/worker/src/api/ui_bundle.ts');

const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');

// Find assets
const assetsDir = path.join(distDir, 'assets');
const assetFiles = fs.readdirSync(assetsDir);

const jsFile = assetFiles.find((f) => f.endsWith('.js'));
const cssFile = assetFiles.find((f) => f.endsWith('.css'));

const jsContent = jsFile ? fs.readFileSync(path.join(assetsDir, jsFile), 'utf8') : '';
const cssContent = cssFile ? fs.readFileSync(path.join(assetsDir, cssFile), 'utf8') : '';

const output = `// Auto-generated embedded frontend bundle
export const UI_BUNDLE = {
  html: ${JSON.stringify(html)},
  jsPath: '/assets/${jsFile}',
  jsContent: ${JSON.stringify(jsContent)},
  cssPath: '/assets/${cssFile}',
  cssContent: ${JSON.stringify(cssContent)},
};
`;

fs.writeFileSync(targetFile, output, 'utf8');
console.log(`Successfully embedded UI bundle into ${targetFile}`);
