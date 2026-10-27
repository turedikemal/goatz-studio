const fs = require('fs');
const path = require('path');
const { transform } = require('esbuild');
const postcss = require('postcss');

const root = path.join(__dirname, '..');
const assets = ['site.css', 'site.js', 'cart.js', 'svc-nav.js', 'wizard.js'];

(async () => {
  const outDir = path.join(root, 'public', 'dist');
  fs.mkdirSync(outDir, { recursive: true });
  const styles = postcss.parse(fs.readFileSync(path.join(root, 'public', 'site.css'), 'utf8'));
  const chunks = { wizard: postcss.root(), works: postcss.root(), blocks: postcss.root() };
  const feature = (node) => {
    if (node.type === 'rule') {
      if (node.selectors.every((s) => /\.wz-/.test(s))) return 'wizard';
      if (node.selectors.every((s) => /\.(?:works?-|wp-|fd-|fb-)/.test(s))) return 'works';
      if (node.selectors.every((s) => /\.(?:k-|g-|pg-|page-hero)/.test(s))) return 'blocks';
    }
    if (node.type === 'atrule' && /keyframes$/.test(node.name) && /^wz/.test(node.params)) return 'wizard';
    return null;
  };
  const split = (container, targets) => {
    for (const node of [...container.nodes]) {
      const key = feature(node);
      if (key) { targets[key].append(node.clone()); node.remove(); }
      else if (node.type === 'atrule' && /^(media|supports|layer)$/.test(node.name) && node.nodes) {
        const wrappers = Object.fromEntries(Object.keys(targets).map((name) => [name, node.clone({ nodes: [] })]));
        split(node, wrappers);
        for (const name of Object.keys(targets)) if (wrappers[name].nodes.length) targets[name].append(wrappers[name]);
        if (!node.nodes.length) node.remove();
      }
    }
  };
  split(styles, chunks);
  const mobileStyles = styles.clone();
  mobileStyles.walkAtRules((rule) => {
    if (/keyframes$/.test(rule.name) || (rule.name === 'media' && /min-width\s*:\s*(\d+)px/.test(rule.params) && Number(RegExp.$1) > 700)) rule.remove();
  });
  mobileStyles.walkRules((rule) => {
    const selectors = rule.selectors.filter((s) => !/html(?:\.js)?\.mo-|\.(?:fx-|ns\b|cam-flash|polaroid|pz\b)/.test(s));
    if (!selectors.length) rule.remove();
    else rule.selectors = selectors;
  });
  mobileStyles.walkDecls((decl) => { if (/^(?:animation|transition)(?:-|$)|^will-change$/.test(decl.prop)) decl.remove(); });
  const mobileCss = await transform(mobileStyles.toString(), { loader: 'css', minify: true, target: 'es2020' });
  fs.writeFileSync(path.join(outDir, 'site-mobile.css'), mobileCss.code + '\n');
  for (const name of assets) {
    const source = name === 'site.css' ? styles.toString() : fs.readFileSync(path.join(root, 'public', name), 'utf8');
    const result = await transform(source, { loader: name.endsWith('.css') ? 'css' : 'js', minify: true, target: 'es2020' });
    fs.writeFileSync(path.join(outDir, name), result.code + '\n');
  }
  for (const [name, css] of Object.entries(chunks)) {
    const result = await transform(css.toString(), { loader: 'css', minify: true, target: 'es2020' });
    fs.writeFileSync(path.join(outDir, `${name}.css`), result.code + '\n');
  }
  const site = fs.readFileSync(path.join(root, 'public', 'site.js'), 'utf8');
  const motionStart = site.indexOf('  //  Hareketler');
  if (motionStart < 0) throw new Error('Mobile bundle split marker not found');
  const mobileSource = `${site.slice(0, motionStart)}})();\n`;
  const mobile = await transform(mobileSource, { loader: 'js', minify: true, target: 'es2020' });
  fs.writeFileSync(path.join(outDir, 'site-mobile.js'), mobile.code + '\n');
})().catch((error) => { console.error(error); process.exitCode = 1; });
