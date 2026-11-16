const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'public/attribution.js'), 'utf8');

function visit({ query = '', referrer = '', state = new Map(), blocked = false } = {}) {
  const storage = {
    getItem(key) { if (blocked) throw new Error('blocked'); return state.get(key) || null; },
    setItem(key, value) { if (blocked) throw new Error('blocked'); state.set(key, value); },
  };
  const window = { location: { search: query } };
  vm.runInNewContext(source, { window, document: { referrer }, sessionStorage: storage, URLSearchParams, URL });
  return window.getReservationOrigin();
}

test('tagged links identify a source and persist across pages in the same session', () => {
  const state = new Map();
  assert.equal(visit({ query: '?utm_source=instagram&utm_medium=social', state }), 'Instagram');
  assert.equal(visit({ referrer: 'https://peluqueria.turacion.com.uy/preguntas-frecuentes.html', state }), 'Instagram');
  assert.equal(visit({ query: '?utm_source=google_maps', state }), 'Google Maps');
  assert.equal(visit({ state }), 'Google Maps');
});

test('untagged referrers are classified conservatively without collecting their full URL', () => {
  assert.equal(visit({ referrer: 'https://www.turacion.com.uy/servicios/peluqueria?private=x' }), 'Web Tu Racion');
  assert.equal(visit({ referrer: 'https://www.google.com/search?q=test' }), 'Google (sin especificar)');
  assert.equal(visit({ referrer: 'https://peluqueria.turacion.com.uy/' }), 'Sin identificar');
  assert.equal(visit({ referrer: 'https://turacion.com.uy.ejemplo.org/' }), 'Sin identificar');
  assert.equal(visit(), 'Sin identificar');
});

test('unknown, hostile and unavailable storage do not expose input or break attribution', () => {
  assert.equal(visit({ query: '?utm_source=%3Dprivate' }), 'Otra fuente etiquetada');
  assert.equal(visit({ query: '?utm_source=constructor' }), 'Otra fuente etiquetada');
  assert.equal(visit({ query: '?utm_source=qr_local', blocked: true }), 'QR en local');
  assert.equal(visit({ blocked: true }), 'Sin identificar');
  assert.equal(visit({ state: new Map([['trcorte_origen_reserva', '=private']]) }), 'Sin identificar');
});

test('both public entry pages load the tracker and old paths retain redirect support', () => {
  for (const page of ['index.html', 'preguntas-frecuentes.html']) {
    const html = fs.readFileSync(path.join(root, 'public', page), 'utf8');
    assert.match(html, /<script src="attribution\.js"/);
  }
});
