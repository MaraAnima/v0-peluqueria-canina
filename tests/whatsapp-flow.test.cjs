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
    messages: [], confirmations: [], lists: [], conversation: { ID: 'test', Estado: 'Abierto', Telefono: 'test' } };
  const records = {
    Flujos: [{ ID: 'welcome_default', Activo: true, Disparadores: 'hola,agendar', 'Start Node ID': 'start' }],
    FlowNodes: [
      { ID: 'start', 'Flow ID': 'welcome_default', Tipo: 'start' },
      { ID: 'menu', 'Flow ID': 'welcome_default', Tipo: 'question', Texto: '1. Agendar turno\n2. Cancelar turno', 'Opciones JSON': '["Agendar","Cancelar turno"]' },
      { ID: 'schedule', 'Flow ID': 'welcome_default', Tipo: 'action' },
      { ID: 'cancel', 'Flow ID': 'welcome_default', Tipo: 'action' }
    ],
    FlowEdges: [
      { 'Flow ID': 'welcome_default', 'From Node ID': 'start', 'To Node ID': 'menu' },
      { 'Flow ID': 'welcome_default', 'From Node ID': 'menu', 'To Node ID': 'schedule', Condicion: 'agenda,agendar,agendar turno' },
      { 'Flow ID': 'welcome_default', 'From Node ID': 'menu', 'To Node ID': 'cancel', Condicion: 'cancelar,cancelar turno' }
    ]
  };
  const sheet = {
    getDataRange: () => ({ getValues: () => state.rows.map(row => [...row]) }),
    getLastRow: () => state.rows.length,
    getLastColumn: () => 21,
    getRange: (row, column) => ({ getValue: () => state.rows[row - 1]?.[column - 1], setBackground() {} }),
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
  for (const text of ['', '0', '3', 'consultas', 'Hablar con un agente', 'unknown']) {
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
  assert.equal(state.lists[0].buttons.length, 2);
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

test('default welcome generation contains only schedule and cancellation', () => {
  const { ctx } = setup();
  const appended = [];
  ctx.trDeleteWhere_ = () => {};
  ctx.trGetOrCreateSheet_ = () => ({});
  ctx.trUpdateRowById_ = () => {};
  ctx.trAppendObject_ = (sheet, row) => appended.push({ sheet, row });
  ctx.trCreateDefaultWelcomeFlow_();
  const nodes = appended.filter(item => item.sheet === 'FlowNodes').map(item => item.row);
  assert.deepEqual(nodes.map(node => node.ID), ['start', 'menu', 'schedule', 'cancel']);
  const menu = nodes.find(node => node.ID === 'menu');
  assert.deepEqual(JSON.parse(menu['Opciones JSON']), ['Agendar', 'Cancelar turno']);
  assert.doesNotMatch(menu.Texto, /agente/i);
});
