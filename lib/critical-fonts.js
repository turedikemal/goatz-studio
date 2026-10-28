const corePoints = [...Array.from({ length: 95 }, (_, i) => i + 0x20), ...Array.from({ length: 112 }, (_, i) => i + 0x2000), 0xa0, 0xa9, 0xb7, 0xd7, 0xe2, 0xc7, 0xd6, 0xdc, 0xe7, 0xf6, 0xfc, 0x131, 0x20ac, 0x2122];
const coreRange = 'U+20-7E,U+A0,U+A9,U+B7,U+D7,U+E2,U+C7,U+D6,U+DC,U+E7,U+F6,U+FC,U+0131,U+2000-206F,U+20AC,U+2122';
const faces = {
  '967f7469b3c1': ['core', coreRange, corePoints],
  'f11d729bb0a4': ['core', coreRange, corePoints],
  '3cd4ee51d59e': ['tr', 'U+011E-011F,U+0130,U+015E-015F', [0x11e, 0x11f, 0x130, 0x131, 0x15e, 0x15f]],
  'cf3eb50fb210': ['tr', 'U+011E-011F,U+0130,U+015E-015F', [0x11e, 0x11f, 0x130, 0x131, 0x15e, 0x15f]],
};
function subtractRange(ranges, excluded) {
  const points = [];
  for (const match of ranges.matchAll(/U\+([0-9A-F]+)(?:-([0-9A-F]+))?/gi)) {
    for (let cp = parseInt(match[1], 16), end = parseInt(match[2] || match[1], 16); cp <= end; cp++) if (!excluded.has(cp)) points.push(cp);
  }
  const compact = [];
  for (let i = 0; i < points.length; i++) {
    const from = points[i]; let to = from;
    while (points[i + 1] === to + 1) to = points[++i];
    compact.push('U+' + from.toString(16) + (to === from ? '' : '-' + to.toString(16)));
  }
  return compact.join(',');
}
function inlineCriticalFonts(css) {
  const critical = [];
  const fallback = css.replace(/@font-face\s*\{([^}]+)\}/g, (face, rule) => {
    const source = /url\(\/fonts\/inter\/([a-f0-9]+)\.woff2\)/.exec(rule);
    const config = source && faces[source[1]];
    if (!config) return face;
    const [suffix, range, points] = config;
    const name = source[1] + '-' + suffix + '.woff2';
    critical.push('@font-face{' + rule.replace(source[0], `url(/font-subsets/${name}?v=2)`).replace(/unicode-range:[^;}]+/, 'unicode-range:' + range) + '}');
    return face.replace(/unicode-range:([^;}]+)/, (_, ranges) => 'unicode-range:' + subtractRange(ranges, new Set(points)));
  });
  return fallback + '\n' + critical.join('\n');
}
module.exports = { inlineCriticalFonts };
