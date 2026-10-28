const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const WIDTHS = [160, 240, 320, 480, 560, 640, 768, 960, 1280];
const pending = new Map();
const valid = (name) => /^[a-z0-9-]+\.(?:png|jpe?g|webp)$/.test(name);
function version(file) {
  const stat = fs.statSync(file);
  return crypto.createHash('sha1').update(`responsive-v4:${stat.size}:${stat.mtimeMs}`).digest('hex').slice(0, 12);
}
function url(name, width, fingerprint, profile = '') {
  return `/responsive/${profile === 'photo' ? 'photo/' : ''}${width}/${name}?v=${fingerprint}`;
}
async function generate(name, width, uploadDir, outputDir, format = 'webp', profile = '') {
  if (!valid(name) || !WIDTHS.includes(width) || !['webp', 'avif'].includes(format) || !['', 'photo'].includes(profile)) return null;
  const input = path.join(uploadDir, name);
  const fingerprint = version(input);
  const output = path.join(outputDir, `${name}-${profile || 'natural'}-${width}-${fingerprint}.${format}`);
  const smaller = () => fs.statSync(output).size < fs.statSync(input).size ? output : null;
  if (fs.existsSync(output)) return smaller();
  if (!pending.has(output)) pending.set(output, (async () => {
    const meta = await sharp(input).metadata();
    const available = profile === 'photo' ? Math.min(meta.width || 0, (meta.height || 0) * 0.8) : meta.width;
    if (!available || available <= width || (meta.orientation && meta.orientation !== 1) || (meta.pages && meta.pages > 1)) return null;
    fs.mkdirSync(outputDir, { recursive: true });
    let image = sharp(input).resize(profile === 'photo' ? { width, height: Math.round(width * 1.25), fit: 'cover', position: 'centre', withoutEnlargement: true } : { width, withoutEnlargement: true });
    image = format === 'avif' ? image.avif({ quality: 65, effort: 4, chromaSubsampling: '4:4:4' }) : image.webp({ quality: 82, effort: 5 });
    await image.toFile(output);
    return smaller();
  })().finally(() => pending.delete(output)));
  return pending.get(output);
}
module.exports = { WIDTHS, valid, version, url, generate };
