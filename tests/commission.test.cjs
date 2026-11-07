const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const code = fs.readFileSync(process.env.RESCHEDULE_SCRIPT_PATH ||
  path.resolve(__dirname, '../apps-script/Codigo.gs'), 'utf8');
const spreadsheetId = '11rzRToVwRoBOVNr-G0KYV7gi_NCUEmBG2UsMhydc3Cg';

function setup(lastRow = 4) {
  const state = { writes: [], locked: false, rows: [] };
  const sheet = {
    getName: () => 'Reservas',
    getLastRow: () => lastRow,
    appendRow: values => { state.rows.push(Array.from(values)); lastRow++; },
    getRange: (row, column, height, width) => ({
      getValue: () => '',
      setFormulas(formulas) {
        assert.equal(state.locked, true);
        if (state.failWrite) throw new Error('Write failed');
        state.writes.push({ row, column, height, width, formulas: Array.from(formulas, row => Array.from(row)) });
      }
    })
  };
  const lock = {
    waitLock() { state.locked = true; },
    tryLock() { if (state.locked) return false; state.locked = true; return true; },
    releaseLock() { state.locked = false; }
  };
  const ctx = vm.createContext({ Date, Logger: { log() {} },
    LockService: { getScriptLock: () => lock } });
  vm.runInContext(code, ctx);
  ctx.getSheet = () => sheet;
  ctx.generateReservationId = () => 'TR-TEST';
  ctx.trySortReservations = () => true;
  const edit = (first = 3, last = first, column = 13, endColumn = column, name = 'Reservas') => ({
    source: { getId: () => spreadsheetId },
    range: { getSheet: () => ({ ...sheet, getName: () => name }), getRow: () => first,
      getLastRow: () => last, getColumn: () => column, getLastColumn: () => endColumn }
  });
  return { ctx, state, sheet, edit };
}

test('commission removes VAT, rounds to whole pesos and follows the current row', () => {
  const { ctx } = setup();
  assert.equal(ctx.reservationCommissionFormula(),
    '=IF(INDEX($M:$M;ROW())="";"";IFERROR(ROUND(INDEX($M:$M;ROW())/(1+22%)*10%;0);""))');
});

test('existing commissions fill T only through the last used row, never the header or blank future rows', () => {
  const { ctx, state } = setup();
  ctx.actualizarComisionesReservas();
  assert.equal(state.writes.length, 1);
  const write = state.writes[0];
  assert.deepEqual([write.row, write.column, write.height, write.width], [2, 20, 3, 1]);
  assert.equal(write.formulas.every(row => row[0] === ctx.reservationCommissionFormula()), true);
  assert.equal(state.locked, false);
  setup(1).ctx.actualizarComisionesReservas();
});

test('price edits and multi-row pastes restore only their own commission formulas', () => {
  const { ctx, state, edit } = setup();
  ctx.onEdit(edit());
  ctx.onEdit(edit(2, 4, 12, 14));
  assert.deepEqual(state.writes.map(write => [write.row, write.column, write.height]), [[3, 20, 1], [2, 20, 3]]);
  assert.equal(state.locked, false);
});

test('commission edits ignore headers, other columns and other spreadsheets or sheets', () => {
  const { ctx, state, edit } = setup();
  ctx.updateReservationCommissionsOnEdit();
  ctx.updateReservationCommissionsOnEdit(edit(1));
  ctx.updateReservationCommissionsOnEdit(edit(3, 3, 19));
  ctx.updateReservationCommissionsOnEdit(edit(3, 3, 13, 13, 'Conversaciones'));
  const other = edit();
  other.source.getId = () => 'another-spreadsheet';
  ctx.updateReservationCommissionsOnEdit(other);
  assert.equal(state.writes.length, 0);
  state.failWrite = true;
  ctx.updateReservationCommissionsOnEdit(edit());
  assert.equal(state.locked, false);
});

test('new bookings append their commission formula in T without using future blank rows', () => {
  const { ctx, state } = setup();
  const result = ctx.saveReservation({ fecha: '2026-11-10', hora: '12:00', nombre: 'Test', precio: 1220 });
  assert.equal(result.success, true);
  assert.equal(state.rows.length, 1);
  assert.equal(state.rows[0][12], 1220);
  assert.equal(state.rows[0][18], '');
  assert.equal(state.rows[0][19], ctx.reservationCommissionFormula());
});
