const fs = require('fs');
const path = require('path');
const { transform } = require('esbuild');

const root = path.join(__dirname, '..');
const assets = ['site.css', 'site.js', 'cart.js', 'svc-nav.js', 'wizard.js'];

(async () => {
  const outDir = path.join(root, 'public', 'dist');
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of assets) {
    const source = fs.readFileSync(path.join(root, 'public', name), 'utf8');
    const result = await transform(source, { loader: name.endsWith('.css') ? 'css' : 'js', minify: true, target: 'es2020' });
    fs.writeFileSync(path.join(outDir, name), result.code + '\n');
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
