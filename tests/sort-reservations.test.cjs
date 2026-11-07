const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const code = fs.readFileSync(process.env.RESCHEDULE_SCRIPT_PATH ||
  path.resolve(__dirname, '../apps-script/Codigo.gs'), 'utf8');
const spreadsheetId = '11rzRToVwRoBOVNr-G0KYV7gi_NCUEmBG2UsMhydc3Cg';

function setup(rows = [], maxColumns = 26, lastDataColumn = 18) {
  const state = { rows: [['ID', 'Timestamp', 'Fecha', 'Hora'], ...rows], sorts: 0, locked: false, triggers: [], added: 0 };
  const sheet = {
    getName: () => 'Reservas',
    getLastRow: () => state.rows.length,
    getLastColumn: () => lastDataColumn,
    getMaxColumns: () => maxColumns,
    insertColumnsAfter: (after, count) => { assert.equal(after, maxColumns); maxColumns += count; state.added += count; },
    getRange: (row, column, height, width) => ({
      getValues: () => state.rows.slice(row - 1, row - 1 + height).map(values =>
        Array.from({ length: width }, (_, i) => values[column - 1 + i] ?? '')),
      setValues(values) {
        for (let i = 0; i < height; i++) {
          for (let j = 0; j < width; j++) state.rows[row - 1 + i][column - 1 + j] = values[i][j];
        }
      },
      clearContent() {
        state.cleared = true;
        for (let i = row - 1; i < row - 1 + height; i++) {
          state.rows[i].splice(column - 1, width);
        }
      },
      sort(specs) {
        assert.equal(row, 2, 'The header must never be sorted');
        assert.equal(column, 1);
        assert.equal(width, lastDataColumn + 2, 'Include operator, commission and per-reservation notes');
        if (state.failSort) throw new Error('Sort unavailable');
        const data = state.rows.slice(1);
        data.sort((a, b) => {
          for (const spec of specs) {
            assert.equal(spec.ascending, true);
            const delta = a[spec.column - 1] - b[spec.column - 1];
            if (delta) return delta;
          }
          return 0;
        });
        state.rows.splice(1, data.length, ...data);
        state.sorts++;
      }
    })
  };
  const lock = {
    waitLock() { assert.equal(state.locked, false); state.locked = true; },
    tryLock() { if (state.locked) return false; state.locked = true; return true; },
    releaseLock() { state.locked = false; }
  };
  const ctx = vm.createContext({
    Date, console, Logger: { log() {} },
    LockService: { getScriptLock: () => lock },
    Utilities: { formatDate(date, zone, format) {
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
        timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).formatToParts(date).map(part => [part.type, part.value]));
      return format === 'yyyyMMdd' ? parts.year + parts.month + parts.day : parts.hour + ':' + parts.minute;
    } },
    ScriptApp: {
      EventType: { ON_EDIT: 'EDIT' },
      getProjectTriggers: () => state.triggers,
      newTrigger(handler) {
        return { forSpreadsheet(id) {
          assert.equal(id, spreadsheetId);
          return { onEdit: () => ({ create: () => state.triggers.push({
            getHandlerFunction: () => handler, getEventType: () => 'EDIT',
            getTriggerSourceId: () => id
          }) }) };
        } };
      }
    }
  });
  vm.runInContext(code, ctx);
  ctx.getSheet = () => sheet;
  return { ctx, state, sheet };
}

const record = (id, date, time) => {
  const row = Array(18).fill('');
  row[0] = id;
  row[2] = date;
  row[3] = time;
  row[4] = 'Client ' + id;
  row[16] = id + '@example.invalid';
  row[17] = 'Confirmada';
  return row;
};

test('sort keys handle native dates, serials, text dates and hours', () => {
  const { ctx } = setup();
  const date = new Date('2026-11-07T03:00:00Z');
  for (const value of [date, '2026-11-07', '7/11/2026', 46333]) {
    assert.equal(ctx.reservationDateSortKey(value), 20261107);
  }
  assert.equal(ctx.reservationDateSortKey('2027-02-30'), 99999999);
  assert.equal(ctx.reservationDateSortKey(''), 99999999);
  for (const value of [12, 0.5, '12', '12:00']) {
    assert.equal(ctx.reservationTimeSortKey(value), 720);
  }
  assert.equal(ctx.reservationTimeSortKey(new Date('2026-11-07T15:00:00Z')), 720);
  assert.equal(ctx.reservationTimeSortKey('9:05'), 545);
  assert.equal(ctx.reservationTimeSortKey('25:00'), 9999);
});

test('sorting moves full records without rewriting dates or the header', () => {
  const early = record('early', '2026-11-07', 12);
  const late = record('late', '08/11/2026', '09:00');
  const first = record('first', new Date('2026-11-07T03:00:00Z'), 0.375);
  const undated = record('blank', '', '');
  const api = setup([late, early, undated, first]);
  const original = new Map(api.state.rows.slice(1).map(values => [values[0], [...values]]));
  api.ctx.ordenarReservasPorFecha();
  assert.deepEqual(api.state.rows.map(values => values[0]), ['ID', 'first', 'early', 'late', 'blank']);
  for (const values of api.state.rows.slice(1)) assert.deepEqual(values, original.get(values[0]));
  assert.equal(api.state.rows[0][2], 'Fecha');
  assert.equal(api.state.cleared, true);
  assert.equal(api.state.locked, false);
});

test('sorting uses spare columns and always clears temporary keys on failure', () => {
  const api = setup([record('b', '2026-11-08', '12:00'), record('a', '2026-11-07', '12:00')], 18);
  api.state.failSort = true;
  assert.equal(api.ctx.trySortReservations(api.sheet), false);
  assert.equal(api.state.added, 2);
  assert.equal(api.state.cleared, true);
  assert.deepEqual(api.state.rows.slice(1).map(values => values.length), [18, 18]);
});

test('operator, commission and payment notes stay attached to each reservation', () => {
  const later = record('later', '2026-11-08', '14:00');
  later.push('Operator A', 70, 'PAGO');
  const earlier = record('earlier', '2026-11-07', '12:00');
  earlier.push('Operator B', 80, 'PAGO');
  const api = setup([later, earlier], 26, 21);
  api.ctx.ordenarReservasPorFecha();
  assert.deepEqual(api.state.rows.slice(1), [earlier, later]);
});

test('empty sheets are safe and manual edits only sort the reservation date or time', () => {
  const api = setup([]);
  api.ctx.ordenarReservasPorFecha();
  assert.equal(api.state.sorts, 0);
  api.state.rows.push(record('b', '2026-11-08', '12:00'), record('a', '2026-11-07', '12:00'));
  const event = (name, column, lastRow = 3) => ({
    source: { getId: () => spreadsheetId },
    range: { getSheet: () => ({ ...api.sheet, getName: () => name }),
      getColumn: () => column, getLastColumn: () => column, getLastRow: () => lastRow }
  });
  api.ctx.sortReservationsOnEdit(event('Conversaciones', 3));
  api.ctx.sortReservationsOnEdit(event('Reservas', 5));
  api.ctx.sortReservationsOnEdit(event('Reservas', 3, 1));
  assert.equal(api.state.sorts, 0);
  api.ctx.sortReservationsOnEdit(event('Reservas', 3));
  assert.equal(api.state.sorts, 1);
  assert.equal(api.state.locked, false);
});

test('bound spreadsheet edits use the simple trigger without new permissions', () => {
  const api = setup([record('b', '2026-11-08', '12:00'), record('a', '2026-11-07', '12:00')]);
  const edit = {
    source: { getId: () => spreadsheetId },
    range: { getSheet: () => api.sheet, getColumn: () => 4, getLastColumn: () => 4, getLastRow: () => 3 }
  };
  api.ctx.onEdit(edit);
  api.ctx.onEdit(edit);
  assert.equal(api.state.triggers.length, 0);
  assert.equal(api.state.sorts, 2);
});
