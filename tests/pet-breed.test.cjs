const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

function bookingForm() {
  const fields = new Map();
  const sent = [];
  const confirmButton = { textContent: 'Confirmar Reserva', disabled: false };
  const document = {
    addEventListener() {},
    querySelector: () => confirmButton,
    getElementById(id) {
      if (!fields.has(id)) fields.set(id, { value: '', addEventListener() {} });
      return fields.get(id);
    },
  };
  const fetch = async (_url, options) => {
    if (options?.method === 'POST') {
      sent.push(JSON.parse(options.body));
      return { json: async () => ({ error: 'Stopped by test' }) };
    }
    return { json: async () => ({ horarios: ['12:00'] }) };
  };
  const ctx = vm.createContext({ Date, document, fetch, console });
  vm.runInContext(source, ctx);
  ctx.nextStep = () => {};
  ctx.showModal = () => {};
  const data = vm.runInContext('bookingData', ctx);
  Object.assign(data, { date: new Date(2030, 10, 11, 12), time: '12:00' });
  document.getElementById('pet-name').value = 'Luna';
  return { ctx, data, document, sent };
}

test('optional breed dropdown retains the selection and shows it in the summary', () => {
  const app = bookingForm();
  const panel = {};
  app.ctx.renderPetStep(panel);
  assert.match(panel.innerHTML, /<select [^>]*id="pet-breed"/);
  assert.match(panel.innerHTML, /<option value="">/);
  assert.match(panel.innerHTML, /<option value="Mestizo">Mestizo<\/option>/);
  assert.match(panel.innerHTML, /<option value="Otra raza">Otra raza<\/option>/);
  app.document.getElementById('pet-breed').value = 'Caniche';
  app.ctx.savePetAndNext();
  assert.equal(app.data.petBreed, 'Caniche');
  app.ctx.renderPetStep(panel);
  assert.match(panel.innerHTML, /<option value="Caniche" selected>/);
  app.ctx.renderSummaryStep(panel);
  assert.match(panel.innerHTML, /class="summary-label">Raza<\/span>\s*<span class="summary-value">Caniche<\/span>/);
});

test('booking submission keeps the breed and notes in the existing notes field', async () => {
  for (const [breed, notes, expected] of [
    ['Caniche', 'No le gusta el secador', 'Raza: Caniche\nNo le gusta el secador'],
    ['Mestizo', '', 'Raza: Mestizo'],
    ['', 'No le gusta el secador', 'No le gusta el secador'],
  ]) {
    const app = bookingForm();
    app.document.getElementById('pet-breed').value = breed;
    app.document.getElementById('pet-notes').value = notes;
    app.ctx.savePetAndNext();
    await app.ctx.confirmBooking();
    assert.equal(app.sent.length, 1);
    assert.equal(app.sent[0].nombreMascota, 'Luna');
    assert.equal(app.sent[0].notasMascota, expected);
  }
});
