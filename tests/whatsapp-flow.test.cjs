const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const code = fs.readFileSync(process.env.RESCHEDULE_SCRIPT_PATH ||
  path.resolve(__dirname, '../apps-script/Codigo.gs'), 'utf8');

function booking(overrides = {}) {
  return { fecha: '2026-11-10', hora: '12:00', nombre: 'Test', telefono: 'test',
    servicio: 'Bano', tamano: 'Chico', pelaje: 'Corto', nombreMascota: 'Test', ...overrides };
}

function setup() {
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-11-07T13:00:00Z'])); }
  }
  const state = { rows: [['headers']], locked: false, releases: 0, checks: [],
    messages: [], confirmations: [], lists: [], emails: [], writes: 0, confirmationSerial: 0,
    conversation: { ID: 'test', Estado: 'Abierto', Telefono: 'test' } };
  const records = {
    Flujos: [{ ID: 'welcome_default', Activo: true, Disparadores: 'hola,agendar', 'Start Node ID': 'start' }],
    FlowNodes: [
      { ID: 'start', 'Flow ID': 'welcome_default', Tipo: 'start' },
      { ID: 'menu', 'Flow ID': 'welcome_default', Tipo: 'question', Texto: '1. Agendar turno\n2. Cancelar turno\n3. Reagendar turno', 'Opciones JSON': '["Agendar","Cancelar turno","Reagendar turno"]' },
      { ID: 'schedule', 'Flow ID': 'welcome_default', Tipo: 'action' },
      { ID: 'cancel', 'Flow ID': 'welcome_default', Tipo: 'action' },
      { ID: 'reschedule', 'Flow ID': 'welcome_default', Tipo: 'action' }
    ],
    FlowEdges: [
      { 'Flow ID': 'welcome_default', 'From Node ID': 'start', 'To Node ID': 'menu' },
      { 'Flow ID': 'welcome_default', 'From Node ID': 'menu', 'To Node ID': 'schedule', Condicion: 'agenda,agendar,agendar turno' },
      { 'Flow ID': 'welcome_default', 'From Node ID': 'menu', 'To Node ID': 'cancel', Condicion: 'cancelar,cancelar turno' },
      { 'Flow ID': 'welcome_default', 'From Node ID': 'menu', 'To Node ID': 'reschedule', Condicion: 'reagendar,reagendar turno,reagendar cita,cambiar turno' }
    ]
  };
  const sheet = {
    getDataRange: () => ({ getValues: () => state.rows.map(row => [...row]) }),
    getLastRow: () => state.rows.length,
    getLastColumn: () => 21,
    getRange: (row, column, height = 1, width = 1) => ({
      getValue: () => state.rows[row - 1]?.[column - 1],
      setBackground() {},
      setValues(values) {
        assert.equal(state.locked, true);
        assert.equal(height, 1);
        assert.equal(values[0].length, width);
        if (state.failWrite) throw new Error('Write failed');
        state.rows[row - 1].splice(column - 1, width, ...values[0]);
        state.writes++;
      }
    }),
    appendRow(row) {
      assert.equal(state.locked, true, 'Booking writes share the website reservation lock');
      if (state.failWrite) throw new Error('Write failed');
      state.rows.push(Array.from(row));
    }
  };
  const lock = {
    waitLock() {
      if (state.lockUnavailable) throw new Error('Lock unavailable');
      assert.equal(state.locked, false);
      state.locked = true;
    },
    releaseLock() { assert.equal(state.locked, true); state.locked = false; state.releases++; }
  };
  const ctx = vm.createContext({ Date: ClockDate, console, Logger: { log() {} },
    LockService: { getScriptLock: () => lock },
    Session: { getScriptTimeZone: () => 'America/Montevideo' },
    Utilities: {
      getUuid: () => 'confirmation-' + ++state.confirmationSerial,
      formatDate(date, zone, format) {
        const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
          timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
        }).formatToParts(date).map(part => [part.type, part.value]));
        if (format === 'yyyy-MM-dd') return `${parts.year}-${parts.month}-${parts.day}`;
        if (format === 'HH:mm') return `${parts.hour}:${parts.minute}`;
        return `${parts.day}/${parts.month}`;
      }
    },
    MailApp: { sendEmail(message) {
      if (state.failEmail) throw new Error('Email failed');
      state.emails.push(message);
    } },
    ContentService: { MimeType: { JSON: 'json' },
      createTextOutput: text => ({ setMimeType() { return this; }, getContent: () => text }) }
  });
  vm.runInContext(code, ctx);
  ctx.getSheet = () => sheet;
  ctx.generateReservationId = () => 'TR-TEST-' + state.rows.length;
  ctx.trySortReservations = () => true;
  const availability = ctx.getAvailableSlots;
  ctx.getAvailableSlots = (...args) => { state.checks.push(state.locked); return availability(...args); };
  ctx.trSheetToObjects_ = name => records[name] || [];
  ctx.trMarkConversation_ = (_, patch) => Object.assign(state.conversation, patch);
  ctx.trLog_ = () => {};
  ctx.trSendAutomaticMessage_ = (_, __, text) => { assert.equal(state.locked, false); state.messages.push(text); };
  ctx.trSendAutomaticButtons_ = (_, __, text, buttons) => state.lists.push({ text, buttons });
  ctx.trSendAutomaticList_ = (_, __, list) => { assert.equal(state.locked, false); state.lists.push(list); };
  ctx.trSendWhatsappReservationConfirmation = (_, id) => { assert.equal(state.locked, false); state.confirmations.push(id); };
  ctx.sendWhatsappReservationConfirmation = () => ({ ok: true });
  const save = data => ctx.trSaveReservationFromWhatsapp_('test', 'test', data);
  return { ctx, state, records, save };
}

test('menu accepts button IDs, conditions, labels, accents and numbered options', () => {
  const { ctx } = setup();
  for (const text of ['schedule', 'Agendar', 'AGENDAR TURNO', 'agenda', '1']) {
    assert.equal(ctx.trFindEdgeForAnswer_('welcome_default', 'menu', text)['To Node ID'], 'schedule');
  }
  for (const text of ['cancel', 'Cancelar turno', 'cancelar', '2']) {
    assert.equal(ctx.trFindEdgeForAnswer_('welcome_default', 'menu', text)['To Node ID'], 'cancel');
  }
  for (const text of ['reschedule', 'Reagendar', 'Reagendar turno', 'reagendar cita', 'cambiar turno', '3']) {
    assert.equal(ctx.trFindEdgeForAnswer_('welcome_default', 'menu', text)['To Node ID'], 'reschedule');
  }
  for (const text of ['', '0', '4', 'consultas', 'Hablar con un agente', 'unknown']) {
    assert.equal(ctx.trFindEdgeForAnswer_('welcome_default', 'menu', text), null);
  }
});

test('unknown answers repeat the same question without discarding a custom flow', () => {
  const { ctx, state } = setup();
  state.conversation['Flow ID'] = 'welcome_default';
  state.conversation['Flow Node ID'] = 'menu';
  ctx.trRunFlowForIncoming_(state.conversation, 'unknown');
  assert.equal(state.conversation['Flow Node ID'], 'menu');
  assert.match(state.messages[0], /No reconozco/);
  assert.equal(state.lists[0].buttons.length, 3);
});

test('matching custom triggers run before the fallback welcome, including resolved conversations', () => {
  const { ctx, state, records } = setup();
  records.Flujos.push({ ID: 'prices', Activo: true, Disparadores: 'precio', 'Start Node ID': 'prices_start' });
  let selected;
  ctx.trExecuteFlowNode_ = (_, __, flow, node) => { selected = [flow, node]; };
  for (const status of ['Abierto', 'Resuelto']) {
    Object.assign(state.conversation, { Estado: status, 'Flow ID': '', 'Bot State': '' });
    ctx.trRunFlowForIncoming_(state.conversation, 'precios');
    assert.deepEqual(selected, ['prices', 'prices_start']);
  }
});

test('ordinary WhatsApp booking rechecks availability while locked and sends after releasing', () => {
  const api = setup();
  api.save(booking());
  assert.equal(api.state.rows.length, 2);
  assert.deepEqual(api.state.checks, [true]);
  assert.equal(api.state.releases, 1);
  assert.equal(api.state.confirmations.length, 1);
  assert.equal(api.state.rows[1][19], api.ctx.reservationCommissionFormula());
});

test('a slot occupied after displaying the menu is not booked again and gets fresh options', () => {
  const { state, save } = setup();
  save(booking());
  save(booking({ slots: ['12:00', '14:00', '16:00'] }));
  assert.equal(state.rows.length, 2);
  assert.equal(state.confirmations.length, 1);
  assert.equal(state.conversation['Bot State'], 'esperando_hora');
  assert.deepEqual(Array.from(JSON.parse(state.conversation['Bot Data JSON']).slots), ['14:00', '16:00']);
  assert.match(state.messages.at(-1), /ya no esta disponible/);
});

test('web and WhatsApp bookings cannot take the same slot', () => {
  const { ctx, state, save } = setup();
  const response = ctx.doPost({ postData: { contents: JSON.stringify(booking()) } });
  assert.equal(JSON.parse(response.getContent()).success, true);
  save(booking());
  assert.equal(state.rows.length, 2);
  assert.equal(state.confirmations.length, 0);
});

test('deslanado reserves the following slot and filters unavailable or last starts', () => {
  const { ctx, state, save } = setup();
  const data = booking({ servicio: 'Bano + deslanado' });
  assert.deepEqual(Array.from(ctx.trAvailableReservationSlots_(data, data.fecha)), ['12:00', '14:00']);
  save(data);
  assert.equal(state.rows[1][14], 'SI');
  assert.equal(state.rows[1][15], '14:00');
  assert.deepEqual(Array.from(ctx.getAvailableSlots(data.fecha)), ['16:00']);
});

test('deslanado cannot use the last start or an occupied following slot', () => {
  let api = setup();
  api.save(booking({ servicio: 'Bano + deslanado', hora: '16:00' }));
  assert.equal(api.state.rows.length, 1);
  assert.equal(api.state.conversation['Bot State'], 'esperando_hora');
  api = setup();
  api.save(booking({ hora: '14:00' }));
  api.save(booking({ servicio: 'Bano + deslanado' }));
  assert.equal(api.state.rows.length, 2);
  assert.equal(api.state.confirmations.length, 1);
  assert.equal(api.state.conversation['Bot State'], 'esperando_fecha');
});

test('the abbreviated deslanado and haircut service also blocks the following slot', () => {
  const { ctx, state, save } = setup();
  const data = booking({ servicio: 'Bano + desl. y corte' });
  assert.deepEqual(Array.from(ctx.trAvailableReservationSlots_(data, data.fecha)), ['12:00', '14:00']);
  save(data);
  assert.equal(state.rows[1][14], 'SI');
  assert.equal(state.rows[1][15], '14:00');
  assert.deepEqual(Array.from(ctx.getAvailableSlots(data.fecha)), ['16:00']);
});

test('invalid, past, holiday, elapsed and out-of-schedule slots are rejected without saving', () => {
  for (const [fecha, hora] of [
    ['2026-02-31', '12:00'], ['2026-11-06', '12:00'], ['2026-12-25', '12:00'],
    ['2026-11-07', '09:00'], ['2026-11-07', '11:00'], ['2026-11-08', '15:00']
  ]) {
    const { state, save } = setup();
    save(booking({ fecha, hora }));
    assert.equal(state.rows.length, 1, fecha + ' ' + hora);
    assert.equal(state.confirmations.length, 0);
    assert.equal(state.locked, false);
  }
});

test('failed lock or sheet write never confirms a booking or leaves the lock held', () => {
  for (const failure of ['lockUnavailable', 'failWrite']) {
    const { state, save } = setup();
    state[failure] = true;
    save(booking());
    assert.equal(state.rows.length, 1);
    assert.equal(state.confirmations.length, 0);
    assert.equal(state.locked, false);
    assert.match(state.messages[0], /No pude guardar/);
  }
});

test('default welcome offers schedule, cancellation and rescheduling but no agent', () => {
  const { ctx } = setup();
  const appended = [];
  ctx.trDeleteWhere_ = () => {};
  ctx.trGetOrCreateSheet_ = () => ({});
  ctx.trUpdateRowById_ = () => {};
  ctx.trAppendObject_ = (sheet, row) => appended.push({ sheet, row });
  ctx.trCreateDefaultWelcomeFlow_();
  const nodes = appended.filter(item => item.sheet === 'FlowNodes').map(item => item.row);
  assert.deepEqual(nodes.map(node => node.ID), ['start', 'menu', 'schedule', 'cancel', 'reschedule']);
  const menu = nodes.find(node => node.ID === 'menu');
  assert.deepEqual(JSON.parse(menu['Opciones JSON']), ['Agendar', 'Cancelar turno', 'Reagendar turno']);
  assert.doesNotMatch(menu.Texto, /agente/i);
});

function rescheduleSession(overrides = {}) {
  const api = setup();
  const row = ['TR-TEST-001', 'created', '2026-11-10', '12:00', 'Test', '099123456',
    'Bano', 'Chico', 'Corto', 'Test', 'Notes', '1 h', 720, 'Perfume', 'NO', '',
    'original@example.invalid', 'Confirmada', 'Operator', api.ctx.reservationCommissionFormula()];
  for (const [index, value] of Object.entries(overrides)) row[index] = value;
  api.state.rows.push(row);
  Object.assign(api.state.conversation, {
    Telefono: '59899123456', 'Flow ID': 'welcome_default', 'Flow Node ID': 'menu'
  });
  const input = text => api.ctx.trRunFlowForIncoming_(api.state.conversation, text);
  input('3');
  assert.equal(api.state.conversation['Bot State'], 'esperando_reagenda_id');
  return { ...api, input, data: () => JSON.parse(api.state.conversation['Bot Data JSON']) };
}

test('WhatsApp rescheduling keeps the original occupied until the new slot is confirmed', () => {
  const api = rescheduleSession();
  const before = [...api.state.rows[1]];
  api.input('*tr-test-001*');
  assert.equal(api.state.conversation['Bot State'], 'esperando_reagenda_fecha');
  assert.deepEqual(api.state.rows[1], before);
  assert.ok(!api.ctx.getAvailableSlots('2026-11-10').includes('12:00'));
  api.input('2026-11-11');
  assert.equal(api.state.conversation['Bot State'], 'esperando_reagenda_hora');
  api.input('14:00');
  assert.equal(api.state.conversation['Bot State'], 'esperando_reagenda_confirmacion');
  assert.deepEqual(api.state.rows[1], before);
  assert.equal(api.state.emails.length, 0);
  const preview = api.state.lists.at(-1);
  assert.match(preview.text, /Turno anterior: 10\/11\/2026 a las 12:00/);
  assert.match(preview.text, /Nuevo turno: 11\/11\/2026 a las 14:00/);
  assert.deepEqual(Array.from(preview.buttons, button => button.title), ['Confirmar cambio', 'Elegir otro turno', 'Mantener turno']);
  api.input('Confirmar cambio');
  assert.equal(api.state.rows.length, 2);
  assert.equal(api.state.writes, 1);
  assert.equal(api.state.rows[1][0], before[0]);
  assert.equal(api.state.rows[1][2], '2026-11-11');
  assert.equal(api.state.rows[1][3], '14:00');
  const after = [...api.state.rows[1]];
  for (const index of [2, 3, 15]) after[index] = before[index];
  assert.deepEqual(after, before);
  assert.ok(api.ctx.getAvailableSlots('2026-11-10').includes('12:00'));
  assert.equal(api.state.emails.length, 1);
  assert.equal(api.state.emails[0].to, 'original@example.invalid');
  assert.equal(api.state.conversation.Estado, 'Resuelto');
  assert.equal(api.state.conversation['Reserva ID'], 'TR-TEST-001');
  assert.match(api.state.messages.at(-1), /reagendado correctamente/);
  assert.equal(api.state.locked, false);
});

test('rescheduling rejects missing, cancelled, started and other-phone reservations without exposing details', () => {
  for (const [overrides, id] of [
    [{}, 'bad-id'], [{}, 'TR-MISSING-001'], [{ 17: 'Cancelada' }, 'TR-TEST-001'],
    [{ 2: '2026-11-06' }, 'TR-TEST-001'], [{ 5: '099999999' }, 'TR-TEST-001']
  ]) {
    const api = rescheduleSession(overrides);
    api.input(id);
    assert.equal(api.state.conversation['Bot State'], 'esperando_reagenda_id');
    assert.equal(api.state.writes, 0);
    assert.equal(api.state.emails.length, 0);
    assert.equal(api.state.lists.length, 0);
  }
});

test('same-day rescheduling excludes only itself and does not offer the unchanged slot', () => {
  const api = rescheduleSession();
  api.input('TR-TEST-001');
  api.input('2026-11-10');
  assert.deepEqual(api.data().slots, ['14:00', '16:00']);
  api.input('12:00');
  assert.equal(api.state.writes, 0);
  api.input('14:00');
  assert.equal(api.state.rows[1][3], '12:00');
  api.input('1');
  assert.equal(api.state.rows[1][3], '14:00');
});

test('deslanado can move backward into its released block and keeps the extra slot', () => {
  const api = rescheduleSession({ 3: '14:00', 6: 'Bano + desl. y corte', 14: 'SI', 15: '16:00' });
  api.input('TR-TEST-001');
  api.input('2026-11-10');
  assert.deepEqual(api.data().slots, ['12:00']);
  api.input('12:00');
  assert.equal(api.state.rows[1][3], '14:00');
  assert.equal(api.state.rows[1][15], '16:00');
  api.input('Si');
  assert.equal(api.state.rows[1][3], '12:00');
  assert.equal(api.state.rows[1][15], '14:00');
  assert.ok(api.ctx.getAvailableSlots('2026-11-10').includes('16:00'));
});

test('a slot taken during rescheduling refreshes choices without releasing the original', () => {
  const api = rescheduleSession();
  api.input('TR-TEST-001');
  api.input('2026-11-11');
  api.input('14:00');
  const competing = api.ctx.doPost({ postData: { contents: JSON.stringify(booking({ fecha: '2026-11-11', hora: '14:00' })) } });
  assert.equal(JSON.parse(competing.getContent()).success, true);
  api.input('Confirmar');
  assert.equal(api.state.writes, 0);
  assert.equal(api.state.rows[1][2], '2026-11-10');
  assert.equal(api.state.rows[1][3], '12:00');
  assert.equal(api.state.conversation['Bot State'], 'esperando_reagenda_hora');
  assert.deepEqual(api.data().slots, ['12:00', '16:00']);
  assert.match(api.state.messages.at(-1), /reserva anterior se mantiene/);
  assert.equal(api.state.emails.length, 0);
});

test('a concurrent date or phone change forces a new ID lookup instead of overwriting', () => {
  for (const change of [row => { row[3] = '14:00'; }, row => { row[5] = '099999999'; }]) {
    const api = rescheduleSession();
    api.input('TR-TEST-001');
    api.input('2026-11-11');
    api.input('14:00');
    change(api.state.rows[1]);
    const before = [...api.state.rows[1]];
    api.input('Confirmar');
    assert.deepEqual(api.state.rows[1], before);
    assert.equal(api.state.writes, 0);
    assert.equal(api.state.conversation['Bot State'], 'esperando_reagenda_id');
    assert.equal(api.state.emails.length, 0);
  }
});

test('closed or invalid dates and last deslanado starts are not offered for rescheduling', () => {
  const api = rescheduleSession({ 14: 'SI', 15: '14:00' });
  api.input('TR-TEST-001');
  for (const date of ['2026-12-25', '2026-02-31', '2026-11-06']) {
    api.input(date);
    assert.equal(api.state.conversation['Bot State'], 'esperando_reagenda_fecha');
    assert.equal(api.state.writes, 0);
  }
  api.input('2026-11-11');
  assert.deepEqual(api.data().slots, ['12:00', '14:00']);
  api.input('16:00');
  assert.equal(api.state.writes, 0);
});

test('reschedule lock and sheet failures do not send success or lose the original booking', () => {
  for (const failure of ['lockUnavailable', 'failWrite']) {
    const api = rescheduleSession();
    api.input('TR-TEST-001');
    api.input('2026-11-11');
    api.input('14:00');
    const before = [...api.state.rows[1]];
    api.state[failure] = true;
    api.input('Confirmar');
    assert.deepEqual(api.state.rows[1], before);
    assert.equal(api.state.emails.length, 0);
    assert.equal(api.state.locked, false);
    assert.equal(api.state.conversation['Bot State'], 'esperando_reagenda_id');
    assert.doesNotMatch(api.state.messages.at(-1), /reagendado correctamente/);
  }
});

test('email failure does not undo a successful WhatsApp reschedule or create another booking', () => {
  const api = rescheduleSession();
  api.input('TR-TEST-001');
  api.input('2026-11-11');
  api.input('14:00');
  api.state.failEmail = true;
  api.input('Confirmar');
  assert.equal(api.state.rows.length, 2);
  assert.equal(api.state.rows[1][2], '2026-11-11');
  assert.equal(api.state.rows[1][3], '14:00');
  assert.equal(api.state.writes, 1);
  assert.match(api.state.messages.at(-1), /reagendado correctamente/);
});

function confirmationSession() {
  const api = rescheduleSession();
  api.input('TR-TEST-001');
  api.input('2026-11-11');
  api.input('14:00');
  assert.equal(api.state.conversation['Bot State'], 'esperando_reagenda_confirmacion');
  return api;
}

test('unknown answers or old confirmation buttons never move the reservation', () => {
  const api = confirmationSession();
  const before = [...api.state.rows[1]];
  for (const answer of ['tal vez', '14:00', '99', 'reagenda_confirmar:expired']) {
    api.input(answer);
    assert.deepEqual(api.state.rows[1], before);
    assert.equal(api.state.writes, 0);
    assert.equal(api.state.emails.length, 0);
    assert.equal(api.state.conversation['Bot State'], 'esperando_reagenda_confirmacion');
    assert.match(api.state.lists.at(-1).text, /Turno anterior: 10\/11\/2026 a las 12:00/);
    assert.match(api.state.lists.at(-1).text, /Nuevo turno: 11\/11\/2026 a las 14:00/);
  }
});

test('keeping the original turn closes only the change request, not the appointment', () => {
  for (const answer of ['no', '3', 'Mantener turno', 'Cancelar cambio', 'button']) {
    const api = confirmationSession();
    const before = [...api.state.rows[1]];
    api.input(answer === 'button' ? api.state.lists.at(-1).buttons[2].id : answer);
    assert.deepEqual(api.state.rows[1], before);
    assert.equal(api.state.rows[1][17], 'Confirmada');
    assert.equal(api.state.writes, 0);
    assert.equal(api.state.emails.length, 0);
    assert.equal(api.state.conversation['Bot State'], '');
    assert.equal(api.state.conversation.Estado, 'Resuelto');
    assert.match(api.state.messages.at(-1), /No hice cambios/);
  }
});

test('choosing another turn requires a new summary and rejects a previous summary approval', () => {
  const api = confirmationSession();
  const oldButton = api.state.lists.at(-1).buttons[0].id;
  api.input(api.state.lists.at(-1).buttons[1].id);
  assert.equal(api.state.conversation['Bot State'], 'esperando_reagenda_fecha');
  assert.equal(api.data().reagendaConfirmacionId, undefined);
  api.input('2026-11-12');
  api.input('16:00');
  assert.equal(api.state.writes, 0);
  assert.notEqual(api.state.lists.at(-1).buttons[0].id, oldButton);
  api.input(oldButton);
  assert.equal(api.state.writes, 0);
  assert.equal(api.state.emails.length, 0);
  assert.match(api.state.messages.at(-1), /resumen anterior/);
  api.input(api.state.lists.at(-1).buttons[0].id);
  assert.equal(api.state.writes, 1);
  assert.equal(api.state.rows[1][2], '2026-11-12');
  assert.equal(api.state.rows[1][3], '16:00');
});

test('reschedule mutation helper cannot skip explicit confirmation', () => {
  const api = confirmationSession();
  const before = [...api.state.rows[1]];
  api.ctx.trRescheduleReservationFromWhatsapp_('test', '59899123456', api.data());
  assert.deepEqual(api.state.rows[1], before);
  assert.equal(api.state.writes, 0);
  assert.equal(api.state.emails.length, 0);
  assert.equal(api.state.conversation['Bot State'], 'esperando_reagenda_confirmacion');
});

test('repeating a confirmation button after success does not move the reservation twice', () => {
  const api = confirmationSession();
  const button = api.state.lists.at(-1).buttons[0].id;
  api.input(button);
  const after = [...api.state.rows[1]];
  api.input(button);
  assert.deepEqual(api.state.rows[1], after);
  assert.equal(api.state.rows.length, 2);
  assert.equal(api.state.writes, 1);
  assert.equal(api.state.emails.length, 1);
});
