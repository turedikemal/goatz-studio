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
  const site = fs.readFileSync(path.join(root, 'public', 'site.js'), 'utf8');
  const motionStart = site.indexOf('  //  Hareketler');
  if (motionStart < 0) throw new Error('Mobile bundle split marker not found');
  const mobileSource = `${site.slice(0, motionStart)}})();\n`;
  const mobile = await transform(mobileSource, { loader: 'js', minify: true, target: 'es2020' });
  fs.writeFileSync(path.join(outDir, 'site-mobile.js'), mobile.code + '\n');
})().catch((error) => { console.error(error); process.exitCode = 1; });
