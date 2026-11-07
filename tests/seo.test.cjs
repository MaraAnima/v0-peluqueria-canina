const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const html = read('public/index.html');
const origin = 'https://v0-peluqueria-canina.vercel.app';
const canonical = `${origin}/index.html`;
const title = 'TR Corte | Peluquería canina en El Pinar';
const description = 'Baño, corte y deslanado en El Pinar. Conocé nuestros servicios y precios, y reservá tu turno online en TR Corte.';

test('public entry has consistent search and social metadata before JavaScript runs', () => {
  const head = html.slice(0, html.indexOf('</head>'));
  for (const tag of [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    '<meta name="robots" content="index, follow, max-image-preview:large">',
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    '<meta property="og:locale" content="es_UY">',
    `<meta property="og:image" content="${origin}/images/tr-corte-social.png">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:image" content="${origin}/images/tr-corte-social.png">`,
  ]) assert.ok(head.includes(tag), `Missing metadata: ${tag}`);
  const layout = read('app/layout.tsx');
  assert.ok(layout.includes(title));
  assert.ok(layout.includes(description));
});

test('crawling files include only the canonical page and keep public resources accessible', () => {
  assert.equal(read('public/robots.txt').trim(), [
    'User-agent: *', 'Allow: /', '', `Sitemap: ${origin}/sitemap.xml`,
  ].join('\n'));
  assert.equal(read('public/sitemap.xml').trim(), [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>', `    <loc>${canonical}</loc>`, '  </url>', '</urlset>',
  ].join('\n'));
  assert.ok(read('app/page.tsx').includes("permanentRedirect('/index.html')"));
});

test('optimized photos and responsive gallery variants exist within a size budget', () => {
  const names = ['cliente-feliz-1', 'cliente-feliz-2', 'cliente-feliz-3',
    'cliente-feliz-4', 'cliente-feliz-5-luna', 'cliente-feliz-6',
    'cliente-feliz-7', 'cliente-feliz-8'];
  for (const name of [...names, 'tr-corte-portada', 'perro-servicios',
    'spa-mascotas', 'tr-corte-footer']) {
    assert.ok(html.includes(`src="images/${name}.webp"`));
    const variants = [name];
    if (names.includes(name)) variants.push(`${name}-480`);
    if (name === 'tr-corte-portada') variants.push(`${name}-800`);
    if (name === 'spa-mascotas') variants.push(`${name}-480`);
    for (const variant of variants) {
      assert.ok(html.includes(`images/${variant}.webp`));
      const bytes = fs.readFileSync(path.join(root, 'public/images', `${variant}.webp`));
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
      assert.ok(bytes.length < 300_000, `${variant} exceeds the image budget`);
    }
  }
  const social = fs.readFileSync(path.join(root, 'public/images/tr-corte-social.png'));
  assert.equal(social.readUInt32BE(16), 1200);
  assert.equal(social.readUInt32BE(20), 630);
});
