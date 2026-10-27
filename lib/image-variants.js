const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const WIDTHS = [320, 640, 960];
const SOURCE_RE = /^[a-z0-9-]+\.(?:png|jpe?g|webp)$/;

function variantName(name, width) {
  return `${path.parse(name).name}-${width}-q70.webp`;
}

async function generate(name, input, outputDir) {
  if (!SOURCE_RE.test(name)) return [];
  const meta = await sharp(input).metadata();
  if (!meta.width || !meta.height) return [];
  fs.mkdirSync(outputDir, { recursive: true });
  const outputs = [];
  for (const width of WIDTHS) {
    if (width >= meta.width) continue;
    const file = path.join(outputDir, variantName(name, width));
    if (!fs.existsSync(file)) {
      await sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 70, effort: 5 }).toFile(file);
    }
    outputs.push({ width, file: variantName(name, width) });
  }
  return outputs;
}

async function prepareAll(uploadDir, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const names = fs.readdirSync(uploadDir).filter((name) => SOURCE_RE.test(name));
  let next = 0;
  const worker = async () => {
    while (next < names.length) {
      const name = names[next++];
      try { await generate(name, path.join(uploadDir, name), outputDir); }
      catch (error) { console.warn(`Görsel boyutları üretilemedi (${name}):`, error.message); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, names.length) }, worker));
}

function remove(name, outputDir) {
  for (const width of WIDTHS) {
    try { fs.unlinkSync(path.join(outputDir, variantName(name, width))); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

module.exports = { WIDTHS, generate, prepareAll, remove, variantName };
