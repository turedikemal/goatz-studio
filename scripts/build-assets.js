const fs = require('fs');
const path = require('path');
const { transform } = require('esbuild');
const root = path.join(__dirname, '..');
(async () => {
  fs.mkdirSync(path.join(root, 'public', 'dist'), { recursive: true });
  for (const name of ['site.css', 'site.js', 'promo.js', 'cart.js', 'svc-nav.js', 'wizard.js']) {
    const css = name.endsWith('.css');
    const source = fs.readFileSync(path.join(root, 'public', name), 'utf8');
    const result = await transform(source, { loader: css ? 'css' : 'js', target: 'es2020', minifyWhitespace: true, minifySyntax: !css, minifyIdentifiers: !css });
    fs.writeFileSync(path.join(root, 'public', 'dist', name), result.code);
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
