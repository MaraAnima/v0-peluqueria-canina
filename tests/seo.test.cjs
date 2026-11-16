const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const html = read('public/index.html');
const origin = 'https://peluqueria.turacion.com.uy';
const canonical = `${origin}/`;
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

test('old production host redirects to the new host without affecting preview domains', async () => {
  const config = (await import('../next.config.mjs')).default;
  const redirects = await config.redirects();
  assert.deepEqual(redirects, [{ source: '/index.html', destination: '/', permanent: true }, {
    source: '/:path*',
    has: [{ type: 'host', value: 'v0-peluqueria-canina\\.vercel\\.app' }],
    destination: `${origin}/:path*`,
    permanent: true,
  }]);
  assert.deepEqual(await config.rewrites(), { beforeFiles: [{ source: '/', destination: '/index.html' }] });
});

test('crawling files include the canonical pages and keep public resources accessible', () => {
  assert.equal(read('public/robots.txt').trim(), [
    'User-agent: *', 'Allow: /', '', `Sitemap: ${origin}/sitemap.xml`,
  ].join('\n'));
  assert.equal(read('public/sitemap.xml').trim(), [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>', `    <loc>${canonical}</loc>`, '  </url>',
    '  <url>', `    <loc>${origin}/preguntas-frecuentes.html</loc>`, '  </url>', '</urlset>',
  ].join('\n'));
});

test('frequently asked questions have a linked, crawlable page', () => {
  const faq = read('public/preguntas-frecuentes.html');
  const section = faq.match(/<main class="faq-section"[\s\S]*?<\/main>/);
  assert.ok(section);
  assert.ok(html.includes('href="preguntas-frecuentes.html"'));
  assert.ok(!html.includes('<section class="faq-section"'));
  assert.ok(faq.includes(`<link rel="canonical" href="${origin}/preguntas-frecuentes.html">`));
  assert.ok(faq.includes('href="/#precios"'));
  assert.ok(faq.includes('class="back-button-integrated faq-back" href="/"'));
  assert.equal((section[0].match(/<details>/g) || []).length, 7);
  for (const text of ['¿Cómo reservo un turno', '¿Qué pasa si mi mascota tiene nudos?',
    '¿Cómo puedo cancelar o reagendar mi cita?', 'una mascota por turno']) {
    assert.ok(section[0].includes(text));
  }
});

test('local business metadata and public contact links use the same reservation number', () => {
  const head = html.slice(0, html.indexOf('</head>'));
  const markup = head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(markup, 'Missing LocalBusiness JSON-LD');
  const business = JSON.parse(markup[1]);
  assert.equal(business['@type'], 'LocalBusiness');
  assert.equal(business.name, 'TR Corte');
  assert.equal(business.url, canonical);
  assert.equal(business.address['@type'], 'PostalAddress');
  assert.equal(business.address.addressCountry, 'UY');
  assert.equal(business.telephone, '+59897089390');
  assert.equal(business.openingHoursSpecification, undefined);
  const chatLink = `href="https://wa.me/${business.telephone.slice(1)}"`;
  assert.equal(html.split(chatLink).length - 1, 2);
  assert.ok(read('public/preguntas-frecuentes.html').includes(chatLink));
  assert.ok(html.includes('>097 089 390</a>'));
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
