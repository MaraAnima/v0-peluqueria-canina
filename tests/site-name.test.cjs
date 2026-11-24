const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('home page identifies the canonical website and its publisher', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../public/index.html'), 'utf8');
  const head = html.slice(0, html.indexOf('</head>'));
  const data = [...head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1]));
  const sites = data.filter(item => item['@type'] === 'WebSite');
  assert.equal(sites.length, 1);
  assert.equal(sites[0].name, 'TR Corte');
  assert.equal(sites[0].url, 'https://peluqueria.turacion.com.uy/');
  assert.ok(head.includes(`<link rel="canonical" href="${sites[0].url}">`));
  assert.ok(data.some(item => item['@type'] === 'LocalBusiness' &&
    item['@id'] === sites[0].publisher['@id'] && item.name === sites[0].name));
});
