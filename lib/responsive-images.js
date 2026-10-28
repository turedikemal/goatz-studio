const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const WIDTHS = [320, 640, 960];
const pending = new Map();
const valid = (name) => /^[a-z0-9-]+\.(?:png|jpe?g|webp)$/.test(name);
function version(file) {
  const stat = fs.statSync(file);
  return crypto.createHash('sha1').update(`highq95:${stat.size}:${stat.mtimeMs}`).digest('hex').slice(0, 12);
}
function url(name, width, fingerprint) {
  return `/responsive/${width}/${name}?v=${fingerprint}`;
}
async function generate(name, width, uploadDir, outputDir) {
  if (!valid(name) || !WIDTHS.includes(width)) return null;
  const input = path.join(uploadDir, name);
  const fingerprint = version(input);
  const output = path.join(outputDir, `${name}-${width}-highq95-${fingerprint}.webp`);
  const smaller = () => fs.statSync(output).size < fs.statSync(input).size ? output : null;
  if (fs.existsSync(output)) return smaller();
  if (!pending.has(output)) pending.set(output, (async () => {
    const meta = await sharp(input).metadata();
    if (!meta.width || meta.width <= width || (meta.orientation && meta.orientation !== 1) || (meta.pages && meta.pages > 1)) return null;
    fs.mkdirSync(outputDir, { recursive: true });
    await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: 95, effort: 4 }).toFile(output);
    return smaller();
  })().finally(() => pending.delete(output)));
  return pending.get(output);
}
module.exports = { WIDTHS, valid, version, url, generate };
