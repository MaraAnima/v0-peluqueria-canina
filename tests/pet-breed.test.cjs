const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const backendSource = fs.readFileSync(process.env.RESCHEDULE_SCRIPT_PATH ||
  path.join(__dirname, '../apps-script/Codigo.gs'), 'utf8');

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
    return { json: async () => ({ horarios: ['12:30'] }) };
  };
  const ctx = vm.createContext({ Date, document, fetch, console });
  vm.runInContext(source, ctx);
  ctx.getReservationOrigin = () => 'Instagram';
  ctx.nextStep = () => {};
  ctx.showModal = () => {};
  const data = vm.runInContext('bookingData', ctx);
  Object.assign(data, {
    date: new Date(2030, 10, 11, 12),
    time: '12:30',
    size: vm.runInContext("SIZES.find(size => size.id === 'bano-rp')", ctx),
  });
  document.getElementById('pet-name').value = 'Luna';
  return { ctx, data, document, sent };
}

test('optional breed dropdown retains the selection and shows it in the summary', () => {
  const app = bookingForm();
  const panel = {};
  app.ctx.renderPetStep(panel);
  assert.match(panel.innerHTML, /Solo aceptamos una mascota por turno\./);
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

test('booking submission sends breed and notes independently', async () => {
  for (const [breed, notes] of [
    ['Caniche', 'No le gusta el secador'],
    ['Mestizo', ''],
    ['', 'No le gusta el secador'],
  ]) {
    const app = bookingForm();
    app.document.getElementById('pet-breed').value = breed;
    app.document.getElementById('pet-notes').value = notes;
    app.ctx.savePetAndNext();
    await app.ctx.confirmBooking();
    assert.equal(app.sent.length, 1);
    assert.equal(app.sent[0].nombreMascota, 'Luna');
    assert.equal(app.sent[0].razaMascota, breed);
    assert.equal(app.sent[0].notasMascota, notes);
    assert.equal(app.sent[0].origenLlegada, 'Instagram');
  }
});

function reservationSheet(headers, lastColumn = headers.length) {
  const rows = [];
  const added = [];
  let maxColumns = lastColumn;
  const sheet = {
    getLastColumn: () => lastColumn,
    getMaxColumns: () => maxColumns,
    getLastRow: () => rows.length + 2,
    insertColumnsAfter(column, count) {
      assert.equal(column, maxColumns);
      maxColumns += count;
      added.push(count);
    },
    getRange(row, column, _height, width) {
      return {
        getValues: () => [headers.slice(column - 1, column - 1 + width)],
        getValue: () => '',
        setValue(value) {
          assert.equal(row, 1);
          assert.equal(headers[column - 1], undefined);
          headers[column - 1] = value;
          lastColumn = Math.max(lastColumn, column);
        },
      };
    },
    appendRow(values) { rows.push(Array.from(values)); },
  };
  const ctx = vm.createContext({ Date, Logger: { log() {} } });
  vm.runInContext(backendSource, ctx);
  ctx.getSheet = () => sheet;
  ctx.generateReservationId = () => 'TR-TEST';
  ctx.trySortReservations = () => true;
  return { ctx, rows, added };
}

test('reservations write breed in its header column without moving notes or commission', () => {
  const headers = Array(22).fill('');
  headers[18] = 'Operador';
  headers[19] = 'Comisión';
  headers[21] = 'Raza';
  const { ctx, rows, added } = reservationSheet(headers);
  assert.equal(ctx.saveReservation({ razaMascota: 'Caniche', notasMascota: 'No le gusta el secador' }).success, true);
  assert.equal(rows[0][10], 'No le gusta el secador');
  assert.equal(rows[0][18], '');
  assert.equal(rows[0][19], ctx.reservationCommissionFormula());
  assert.equal(rows[0][20], '');
  assert.equal(rows[0][21], 'Caniche');
  assert.deepEqual(added, []);
});

test('a missing breed column is added past used data; absent or formula-like breeds do not alter notes', () => {
  const headers = Array(20).fill('');
  headers[19] = 'Comisión';
  const { ctx, rows, added } = reservationSheet(headers, 21);
  assert.equal(ctx.saveReservation({ notasMascota: 'Notas existentes' }).success, true);
  assert.equal(ctx.saveReservation({ razaMascota: '=1+1', notasMascota: 'Otras notas' }).success, true);
  assert.equal(rows[0].length, 20);
  assert.equal(rows[0][10], 'Notas existentes');
  assert.equal(rows[1].length, 20);
  assert.equal(rows[1][10], 'Otras notas');
  assert.deepEqual(added, []);
  assert.equal(ctx.saveReservation({ razaMascota: 'Mestizo' }).success, true);
  assert.deepEqual(added, [1]);
  assert.equal(headers[21], 'Raza');
  assert.equal(rows[2][21], 'Mestizo');
});

test('channel and origin use separate columns without overwriting breed, notes or commission', () => {
  const headers = Array(23).fill('');
  headers[19] = 'Comisión';
  headers[21] = 'Raza';
  headers[22] = 'Dato existente';
  const { ctx, rows } = reservationSheet(headers);
  const result = ctx.saveReservation({ razaMascota: 'Mestizo', notasMascota: 'Nota',
    canalReserva: 'Web', origenLlegada: 'Google Maps' });
  assert.equal(result.success, true);
  assert.equal(rows[0][10], 'Nota');
  assert.equal(rows[0][19], ctx.reservationCommissionFormula());
  assert.equal(rows[0][21], 'Mestizo');
  assert.equal(rows[0][22], '');
  assert.equal(headers[22], 'Dato existente');
  assert.equal(headers[23], 'Canal de reserva');
  assert.equal(headers[24], 'Origen de llegada');
  assert.equal(rows[0][23], 'Web');
  assert.equal(rows[0][24], 'Google Maps');
  assert.equal(ctx.saveReservation({ canalReserva: 'WhatsApp', origenLlegada: '=malicioso' }).success, true);
  assert.equal(rows[1][23], 'WhatsApp');
  assert.equal(rows[1][24], 'Sin identificar');
});

test('a failure to create attribution columns does not prevent saving a reservation', () => {
  const { ctx, rows } = reservationSheet(Array(20).fill(''));
  ctx.reservationExtraColumn_ = () => { throw new Error('Header unavailable'); };
  assert.equal(ctx.saveReservation({ canalReserva: 'Web', origenLlegada: 'Instagram' }).success, true);
  assert.equal(rows.length, 1);
});
