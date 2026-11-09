const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const backendCode = fs.readFileSync(process.env.RESCHEDULE_SCRIPT_PATH ||
  path.join(root, 'apps-script/Codigo.gs'), 'utf8');
const frontendCode = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const id = 'TR-TEST-001';

function row(overrides = {}) {
  const values = [id, 'created', '2026-11-10', '12:30', 'Cliente de prueba',
    'test', 'Bano', 'RP', 'Pelo corto', 'Mascota de prueba', '', '1 h', 720,
    'Perfume', 'NO', '', 'original@example.invalid', 'Confirmada'];
  for (const [index, value] of Object.entries(overrides)) values[index] = value;
  return values;
}

function backend(bookings = [row()]) {
  const state = { rows: [['headers'], ...bookings], emails: [], writes: 0, locked: false, sorts: 0 };
  const sheet = {
    getDataRange: () => ({ getValues: () => state.rows.map(values => [...values]) }),
    getLastRow: () => state.rows.length,
    getRange: (number, column, height = 1, width = 1) => ({
      getValue: () => state.rows[number - 1][column - 1],
      setValues(values) {
        assert.equal(state.locked, true, 'Every appointment write must hold the lock');
        assert.equal(height, 1);
        assert.equal(values[0].length, width);
        if (state.failWrite) throw new Error('Write failed');
        state.rows[number - 1].splice(column - 1, width, ...values[0]);
        state.writes++;
      },
      setValue(value) {
        assert.equal(state.locked, true);
        state.rows[number - 1][column - 1] = value;
        state.writes++;
      }
    }),
    appendRow(values) { state.rows.push(Array.from(values)); }
  };
  const ctx = vm.createContext({
    Date, console, Logger: { log() {} },
    Utilities: { formatDate: (_date, _zone, format) => format === 'yyyy-MM-dd' ? '2026-11-07' : '10:00' },
    ContentService: {
      MimeType: { JSON: 'json', TEXT: 'text' },
      createTextOutput: text => ({ setMimeType() { return this; }, getContent: () => text })
    },
    LockService: { getScriptLock: () => ({
      waitLock() { assert.equal(state.locked, false); state.locked = true; },
      releaseLock() { state.locked = false; }
    }) },
    MailApp: { sendEmail(message) {
      if (state.failEmail) throw new Error('Email failed');
      state.emails.push(message);
    } }
  });
  vm.runInContext(backendCode, ctx);
  ctx.getSheet = () => sheet;
  ctx.trySortReservations = () => { state.sorts++; return true; };
  ctx.sendWhatsappReservationConfirmation = () => ({ success: true });
  return {
    state, ctx,
    get: params => JSON.parse(ctx.doGet({ parameter: params }).getContent()),
    post: data => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(data) } }).getContent()),
    move: changes => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({
      action: 'reagendar', id, fechaActual: '2026-11-10', horaActual: '12:30',
      fecha: '2026-11-11', hora: '14:00', ...changes
    }) } }).getContent())
  };
}

test('lookup normalizes ID and returns no contact details', () => {
  const api = backend();
  const result = api.get({ action: 'consultarReagenda', id: ' tr-test-001 ' });
  assert.equal(result.success, true);
  assert.deepEqual(Object.keys(result.reserva).sort(), ['deslanado', 'fecha', 'hora', 'id', 'mascota', 'servicio']);
  assert.equal(result.reserva.id, id);
  assert.equal(api.state.writes, 0);
  assert.ok(api.get({ action: 'consultarReagenda', id: 'TR-UNKNOWN-001' }).error);
  assert.ok(api.get({ action: 'consultarReagenda', id: '<script>' }).error);
});

test('move preserves ID and metadata, releases old slot, and emails original address', () => {
  const api = backend();
  const before = [...api.state.rows[1]];
  const result = api.move({ email: 'ignored@example.invalid' });
  assert.equal(result.success, true);
  assert.equal(result.reservaId, id);
  assert.equal(api.state.rows.length, 2);
  assert.equal(api.state.writes, 1);
  assert.equal(api.state.sorts, 1);
  const after = [...api.state.rows[1]];
  for (const index of [2, 3, 15]) after[index] = before[index];
  assert.deepEqual(after, before);
  assert.ok(Array.from(api.ctx.getAvailableSlots('2026-11-10')).includes('12:30'));
  assert.ok(!Array.from(api.ctx.getAvailableSlots('2026-11-11')).includes('14:00'));
  assert.equal(api.state.emails[0].to, 'original@example.invalid');
  assert.match(api.state.emails[0].htmlBody, /11\/11\/2026/);
  assert.match(api.state.emails[0].htmlBody, /10\/11\/2026/);
});

test('same-day availability ignores only the matching appointment', () => {
  const api = backend([row(), row({ 0: 'TR-OTHER-001', 3: '16:00' })]);
  const available = api.get({ action: 'consultarReagenda', id, fecha: '2026-11-10' }).horarios;
  assert.deepEqual(available, ['12:30', '14:00']);
  assert.equal(api.move({ fecha: '2026-11-10' }).success, true);
});

test('deslanado moves both slots and cannot be downgraded by the request', () => {
  const api = backend([row({ 14: 'SI', 15: '14:00' })]);
  const result = api.move({ hora: '12:30', deslanado: false });
  assert.equal(result.success, true);
  assert.equal(api.state.rows[1][14], 'SI');
  assert.equal(api.state.rows[1][15], '14:00');
  assert.deepEqual(Array.from(api.ctx.getAvailableSlots('2026-11-11')), ['16:00']);
  assert.deepEqual(Array.from(api.ctx.getAvailableSlots('2026-11-10')), ['12:30', '14:00', '16:00']);
});

test('failed validation never releases the old booking or sends email', () => {
  for (const changes of [
    { fecha: '2027-02-30' }, { fecha: '2026-12-25' }, { fecha: '2026-11-06' },
    { fecha: '2026-11-07', hora: '09:00' }, { hora: '11:00' }, { hora: '25:00' },
    { fecha: '2026-11-10', hora: '12:30' }, { fechaActual: '2026-11-09' }
  ]) {
    const api = backend();
    const before = structuredClone(api.state.rows);
    assert.ok(api.move(changes).error, JSON.stringify(changes));
    assert.deepEqual(api.state.rows, before);
    assert.equal(api.state.writes, 0);
    assert.equal(api.state.emails.length, 0);
    assert.equal(api.state.locked, false);
  }
});

test('cancelled and started appointments cannot be looked up or moved', () => {
  for (const original of [row({ 17: 'Cancelada' }), row({ 2: '2026-11-06' }), row({ 2: '2026-11-07', 3: '09:00' })]) {
    const api = backend([original]);
    assert.ok(api.get({ action: 'consultarReagenda', id }).error);
    assert.ok(api.move().error);
    assert.equal(api.state.writes, 0);
  }
});

test('POST rechecks a slot taken after loading availability', () => {
  const api = backend();
  assert.ok(api.get({ action: 'consultarReagenda', id, fecha: '2026-11-11' }).horarios.includes('14:00'));
  api.state.rows.push(row({ 0: 'TR-OTHER-001', 2: '2026-11-11', 3: '14:00' }));
  assert.equal(api.move().code, 'HORARIO_OCUPADO');
  assert.equal(api.state.writes, 0);
});

test('deslanado rejects last slot and an occupied following slot', () => {
  const api = backend([row({ 14: 'SI', 15: '14:00' }), row({ 0: 'TR-OTHER-001', 2: '2026-11-11', 3: '14:00' })]);
  assert.equal(api.move({ hora: '12:30' }).code, 'HORARIO_OCUPADO');
  assert.equal(api.move({ hora: '16:00' }).code, 'HORARIO_OCUPADO');
  assert.equal(api.state.writes, 0);
});

test('sheet and email failures do not create duplicate appointments', () => {
  const api = backend();
  api.state.failWrite = true;
  const before = structuredClone(api.state.rows);
  assert.ok(api.move().error);
  assert.deepEqual(api.state.rows, before);
  assert.equal(api.state.emails.length, 0);
  api.state.failWrite = false;
  api.state.failEmail = true;
  const result = api.move();
  assert.equal(result.success, true);
  assert.equal(result.email.success, false);
  assert.equal(api.state.rows.length, 2);
});

test('ordinary booking, cancellation, and weekend schedules still work', () => {
  const api = backend([]);
  const created = api.post({ nombre: 'Test', telefono: 'test', email: 'test@example.invalid',
    fecha: '2026-11-10', hora: '12:30', servicio: 'Bano', tamano: 'RP',
    pelaje: 'Pelo corto', nombreMascota: 'Test' });
  assert.equal(created.success, true, JSON.stringify(created));
  const createdId = api.state.rows[1][0];
  assert.equal(api.get({ action: 'cancelar', id: createdId }).success, true);
  assert.deepEqual(api.get({ fecha: '2026-11-10' }).horarios, ['12:30', '14:00', '16:00']);
  assert.deepEqual(api.get({ fecha: '2026-11-14' }).horarios, ['09:00', '13:00']);
  assert.deepEqual(api.get({ fecha: '2026-11-15' }).horarios, ['09:00', '11:00', '13:00']);
});

test('weekday 12:30 and 14:00 can both be booked unless the service needs the next slot', () => {
  const fecha = '2026-11-10';
  for (const [occupied, remaining] of [['12:30', '14:00'], ['14:00', '12:30']]) {
    const api = backend([row({ 3: occupied })]);
    assert.deepEqual(api.get({ fecha }).horarios, [remaining, '16:00']);
  }
});

test('old or manual weekday reservations still protect overlapping new slots', () => {
  const fecha = '2026-11-10';
  const oldStart = backend([row({ 3: '12:00' })]);
  assert.deepEqual(oldStart.get({ fecha }).horarios, ['14:00', '16:00']);
  const offGrid = backend([row({ 3: '13:00' })]);
  assert.deepEqual(offGrid.get({ fecha }).horarios, ['16:00']);
  assert.equal(offGrid.state.rows[1][3], '13:00');
});

test('web booking accepts only small and medium dogs at 12:30', () => {
  for (const [tamano, allowed] of [['RP', true], ['RM', true], ['Chico', true], ['Mediano', true],
    ['RG', false], ['Grande', false], ['Desconocido', false]]) {
    const api = backend([]);
    const result = api.post({ nombre: 'Test', telefono: 'test', fecha: '2026-11-10', hora: '12:30',
      servicio: 'Bano', tamano, pelaje: 'Pelo corto', nombreMascota: 'Test' });
    if (allowed) assert.equal(result.success, true, tamano);
    else assert.match(result.error, /solo para perros chicos o medianos/);
    assert.equal(api.state.rows.length, allowed ? 2 : 1);
  }
});

test('web rescheduling uses the saved size for eligibility, not the request', () => {
  const api = backend([row({ 3: '14:00', 7: 'RG' })]);
  assert.deepEqual(api.get({ action: 'consultarReagenda', id, fecha: '2026-11-11' }).horarios, ['14:00', '16:00']);
  const rejected = api.move({ horaActual: '14:00', hora: '12:30', tamano: 'RP' });
  assert.match(rejected.error, /solo para perros chicos o medianos/);
  assert.equal(api.state.writes, 0);
  assert.equal(api.move({ horaActual: '14:00', fecha: '2026-11-14', hora: '09:00' }).success, true);
});

function frontend(fetch) {
  const elements = new Map();
  const document = {
    addEventListener() {},
    querySelectorAll: () => [],
    getElementById(name) {
      if (!elements.has(name)) elements.set(name, {
        innerHTML: '', value: '', disabled: false, focus() {}, classList: { add() {}, remove() {} }
      });
      return elements.get(name);
    }
  };
  const ctx = vm.createContext({ Date, document, fetch, console });
  vm.runInContext(frontendCode, ctx);
  return { ctx, document, state: () => vm.runInContext('rescheduleState', ctx) };
}

test('booking UI offers 12:30 only for eligible sizes and explains why', async () => {
  const app = frontend(async () => ({ json: async () => ({ horarios: ['12:00', '12:30', '14:00', '16:00'] }) }));
  vm.runInContext("currentStep = 6; bookingData.size = { size: 'RM' };", app.ctx);
  await app.ctx.selectDate(2030, 10, 12);
  const container = app.document.getElementById('step-content');
  assert.deepEqual(Array.from(app.ctx.getSelectableSlots()), ['12:30', '14:00', '16:00']);
  assert.match(container.innerHTML, /solo para perros chicos o medianos/);
  app.ctx.selectTime('12:30');
  vm.runInContext("bookingData.size = { size: 'RG' };", app.ctx);
  app.ctx.renderDateTimeStep(container);
  assert.deepEqual(Array.from(app.ctx.getSelectableSlots()), ['14:00', '16:00']);
  assert.doesNotMatch(container.innerHTML, /selectTime\('12:30'\)/);
  app.ctx.selectTime('12:30');
  assert.equal(vm.runInContext('bookingData.time', app.ctx), null);
});

test('frontend discards late availability responses', async () => {
  const pending = [];
  const app = frontend(() => new Promise(resolve => pending.push(resolve)));
  app.ctx.openRescheduleScreen();
  const state = app.state();
  state.id = id;
  state.reservation = { id, fecha: '2030-11-10', hora: '12:00', mascota: '<img onerror=bad>', servicio: 'Bano', deslanado: false };
  const first = app.ctx.selectRescheduleDate(2030, 10, 11);
  const second = app.ctx.selectRescheduleDate(2030, 10, 12);
  pending[1]({ json: async () => ({ success: true, reserva: state.reservation, fecha: '2030-11-12', horarios: ['14:00'] }) });
  await second;
  pending[0]({ json: async () => ({ success: true, reserva: state.reservation, fecha: '2030-11-11', horarios: ['12:30'] }) });
  await first;
  assert.deepEqual(Array.from(state.slots), ['14:00']);
  assert.match(app.document.getElementById('reschedule-content').innerHTML, /&lt;img/);
});

test('ambiguous network failure requires looking up the ID again', async () => {
  let writes = 0;
  const app = frontend(async () => { writes++; throw new Error('Disconnected'); });
  app.ctx.openRescheduleScreen();
  const state = app.state();
  Object.assign(state, { id, reservation: { fecha: '2030-11-10', hora: '12:00' }, date: new Date(2030, 10, 12), time: '14:00', slots: ['14:00'] });
  await app.ctx.confirmReschedule();
  assert.equal(state.reservation, null);
  assert.equal(state.saving, false);
  assert.match(state.error, /Buscá el ID nuevamente/);
  assert.equal(writes, 1);
});
